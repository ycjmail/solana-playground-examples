import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { Lumberjack } from "../target/types/lumberjack";

async function main() {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Lumberjack as anchor.Program<Lumberjack>;

  // The PDA that holds the player account data
  const [playerDataPda, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("player", "utf8"), program.provider.publicKey.toBuffer()],
    program.programId
  );
  let gameDataAccount;

  try {
    gameDataAccount = await program.account.playerData.fetch(playerDataPda);
  } catch (e) {
    let txHash = await program.methods
      .initPlayer()
      .accountsPartial({
        player: playerDataPda,
        signer: program.provider.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`New player created.`);
    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
    await program.provider.connection.confirmTransaction(txHash);
    gameDataAccount = await program.account.playerData.fetch(playerDataPda);
  }

  console.log(
    "You currently have " +
    gameDataAccount.wood +
    " wood and " +
    gameDataAccount.energy +
    " energy in the on chain account."
  );

  //////

  const TIME_TO_REFILL_ENERGY = 30;
  const MAX_ENERGY = 5;

  // You can calculate how much energy the player currently has in the client without calling the program.
  // Like this you can also show a nice countdown to the player until he gets the next energy.
  let clientEnergy = gameDataAccount.energy;
  let lastLoginTime = gameDataAccount.lastLogin * 1000;
  let timePassed = (Date.now() - lastLoginTime) / 1000;
  while (timePassed > TIME_TO_REFILL_ENERGY && clientEnergy < MAX_ENERGY) {
    clientEnergy = +clientEnergy + 1;
    gameDataAccount.lastLogin = gameDataAccount.lastLogin + TIME_TO_REFILL_ENERGY;
    timePassed -= TIME_TO_REFILL_ENERGY;
  }

  console.log(
    "Pre calculated in the client the player has " +
    gameDataAccount.energy +
    " Next energy in: " +
    (TIME_TO_REFILL_ENERGY - timePassed).toFixed(2) +
    " seconds."
  );

  let txHash = await program.methods
    .chopTree()
    .accountsPartial({
      player: playerDataPda,
      signer: program.provider.publicKey,
    })
    .rpc({ skipPreflight: true });

  console.log(`Chopped tree`);
  console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);
  await program.provider.connection.confirmTransaction(txHash);

  gameDataAccount = await program.account.playerData.fetch(playerDataPda);
  lastLoginTime = gameDataAccount.lastLogin * 1000;
  timePassed = (Date.now() - lastLoginTime) / 1000;
  let timeLeftUntilEnergy = TIME_TO_REFILL_ENERGY - timePassed;

  console.log(
    `After chop you have now ` +
    gameDataAccount.wood +
    " wood and " +
    gameDataAccount.energy +
    " energy left. Next energy in: " +
    timeLeftUntilEnergy.toFixed(2) +
    " seconds."
  );

}

main();