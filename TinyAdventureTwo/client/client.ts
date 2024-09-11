import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { TinyAdventureTwo } from "../target/types/tiny_adventure_two";

async function main() {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());


  const program = anchor.workspace
    .TinyAdventureTwo as anchor.Program<TinyAdventureTwo>;

  const provider = anchor.AnchorProvider.env();  
  const payerWallet = provider.wallet as anchor.Wallet;   
  const payer=payerWallet.payer 

  // The PDA adress everyone will be able to control the character if the interact with your program
  const [globalLevel1GameDataAccount, bump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("level1", "utf8")],
      //[program.provider.publicKey.toBuffer()], <- You could also add the player wallet as a seed, then you would have one instance per player. Need to also change the seed in the rust part
      program.programId
    );

  // This is where the program will save the sol reward for the chests and from which the reward will be payed out again
  const [chestVaultAccount, chestBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("chestVault", "utf8")],
      program.programId
    );

  // Initialize level set the player position back to 0 and the caller needs to pay to fill up the chest with sol
  let txHash = await program.methods
    .initializeLevelOne()
    .accountsPartial({
      chestVault: chestVaultAccount,
      newGameDataAccount: globalLevel1GameDataAccount,
      signer: program.provider.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([payer])
    .rpc();

  console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
  await program.provider.connection.confirmTransaction(txHash);

  let balance = await program.provider.connection.getBalance(
    program.provider.publicKey
  );
  console.log(
    `My balance before spawning a chest: ${balance / web3.LAMPORTS_PER_SOL} SOL`
  );

  txHash = await program.methods
    .resetLevelAndSpawnChest()
    .accountsPartial({
      chestVault: chestVaultAccount,
      gameDataAccount: globalLevel1GameDataAccount,
      payer: program.provider.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .signers([payer])
    .rpc();

  console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
  await program.provider.connection.confirmTransaction(txHash);

  console.log("Level reset and chest spawned 💎");
  console.log("o........💎");

  // Here we move to the right three times and collect the chest at the end of the level
  for (let i = 0; i < 3; i++) {
    txHash = await program.methods
      .moveRight("gib")
      .signers([payer])
      .accountsPartial({
        chestVault: chestVaultAccount,
        gameDataAccount: globalLevel1GameDataAccount,
        systemProgram: web3.SystemProgram.programId,
        player: program.provider.publicKey,
      })
      .rpc();

    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
    await program.provider.connection.confirmTransaction(txHash);
    let balance = await program.provider.connection.getBalance(
      program.provider.publicKey
    );
    console.log(`My balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`);

    let gameDateAccount = await program.account.gameDataAccount.fetch(
      globalLevel1GameDataAccount
    );

    console.log(
      "Player position is:",
      gameDateAccount.playerPosition.toString()
    );

    switch (gameDateAccount.playerPosition) {
      case 0:
        console.log("A journey begins...");
        console.log("o........💎");
        break;
      case 1:
        console.log("....o....💎");
        break;
      case 2:
        console.log("......o..💎");
        break;
      case 3:
        console.log(".........\\o/💎");
        console.log("...........\\o/");
        break;
    }
  }
}

main();
