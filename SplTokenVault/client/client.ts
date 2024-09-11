import BN from "bn.js";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  getAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { keypairIdentity, token, Metaplex } from "@metaplex-foundation/js";
import type { TokenVault } from "../target/types/token_vault";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";

async function main() {


  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.TokenVault as anchor.Program<TokenVault>;

  const provider = anchor.AnchorProvider.env();
  const payerWallet = provider.wallet as anchor.Wallet;
  const payer=payerWallet.payer
  const mintAuthority = payer;

  
  const decimals = 9;

  let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_account_owner_pda")],
    program.programId
  );

  const metaplex = new Metaplex(program.provider.connection).use(
    keypairIdentity(payer)
  );

  const createdSFT = await metaplex.nfts().createSft({
    uri: "https://shdw-drive.genesysgo.net/AzjHvXgqUJortnr5fXDG2aPkp2PfFMvu4Egr57fdiite/PirateCoinMeta",
    name: "Gold",
    symbol: "GOLD",
    sellerFeeBasisPoints: 100,
    updateAuthority: mintAuthority,
    mintAuthority: mintAuthority,
    decimals: decimals,
    tokenStandard: TokenStandard.Fungible,
    isMutable: true,
  });

  console.log(
    "Creating semi fungible spl token with address: " + createdSFT.sft.address
  );

  const mintDecimals = Math.pow(10, decimals);

  let mintResult = await metaplex.nfts().mint({
    nftOrSft: createdSFT.sft,
    authority: payer,
    toOwner: program.provider.publicKey,
    amount: token(100 * mintDecimals),
  });

  console.log("Mint to result: " + mintResult.response.signature);

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    program.provider.connection,
    payer,
    createdSFT.mintAddress,
    program.provider.publicKey
  );

  console.log("tokenAccount: " + tokenAccount.address);
  console.log("TokenAccountOwnerPda: " + tokenAccountOwnerPda);

  let tokenAccountInfo = await getAccount(program.provider.connection, tokenAccount.address);
  console.log(
    "Owned token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
  );
  let [tokenVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_vault"), createdSFT.mintAddress.toBuffer()],
    program.programId
  );
  console.log("VaultAccount: " + tokenVault);

  let confirmOptions = {
    skipPreflight: true,
  };


  let txHash = await program.methods
    .initialize()
    .accountsPartial({
      tokenAccountOwnerPda: tokenAccountOwnerPda,
      vaultTokenAccount: tokenVault,
      //senderTokenAccount: tokenAccount.address,
      mintOfTokenBeingSent: createdSFT.mintAddress,
      signer: program.provider.publicKey,
    })
    .rpc(confirmOptions);

  console.log(`Initialize`);
  await logTransaction(txHash);

  console.log(`Vault initialized.`);
  tokenAccountInfo = await getAccount(program.provider.connection, tokenAccount.address);
  console.log(
    "Owned token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
  );
  tokenAccountInfo = await getAccount(program.provider.connection, tokenVault);
  console.log(
    "Vault token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
  );

  async function logTransaction(txHash) {
    const { blockhash, lastValidBlockHeight } =
      await program.provider.connection.getLatestBlockhash();

    await program.provider.connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: txHash,
    });

    console.log(
      `Solana Explorer: https://explorer.solana.com/tx/${txHash}?cluster=devnet`
    );
  }


  txHash = await program.methods
    .transferIn(new anchor.BN(1 * mintDecimals))
    .accountsPartial({
      tokenAccountOwnerPda: tokenAccountOwnerPda,
      vaultTokenAccount: tokenVault,
      senderTokenAccount: tokenAccount.address,
      mintOfTokenBeingSent: createdSFT.mintAddress,
      signer: program.provider.publicKey,
    })
    .signers([payer])
    .rpc(confirmOptions);

  console.log(`Transfer one token into the vault.`);
  await logTransaction(txHash);

  tokenAccountInfo = await getAccount(program.provider.connection, tokenAccount.address);
  console.log(
    "Owned token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
  );

  tokenAccountInfo = await getAccount(program.provider.connection, tokenVault);
  console.log(
    "Vault token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
  );

  txHash = await program.methods
    .transferOut(new anchor.BN(1 * mintDecimals))
    .accountsPartial({
      tokenAccountOwnerPda: tokenAccountOwnerPda,
      vaultTokenAccount: tokenVault,
      senderTokenAccount: tokenAccount.address,
      mintOfTokenBeingSent: createdSFT.mintAddress,
      signer: program.provider.publicKey,
    })
    .signers([payer])
    .rpc(confirmOptions);

  console.log(`Transfer one token out of the vault.`);
  await logTransaction(txHash);

  tokenAccountInfo = await getAccount(program.provider.connection, tokenAccount.address);
  console.log(
    "Owned token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
  );

  tokenAccountInfo = await getAccount(program.provider.connection, tokenVault);
  console.log(
    "Vault token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
  );

};

main();
