import BN from "bn.js";
import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import type { Etracker } from "../target/types/etracker";
describe("Expense Tracker", async () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Etracker as anchor.Program<Etracker>;
  
  let merchantName = "test";
  let amount = 100;
  let id = 1;

  let merchantName2 = "test 2";
  let amount2 = 200;

  let [expense_account] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("expense"),
      program.provider.publicKey.toBuffer(),
      new BN(id).toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  it("Initialize Expense", async () => {
    await program.methods
      .initializeExpense(new anchor.BN(id), merchantName, new anchor.BN(amount))
      .accounts({
        expenseAccount: expense_account,
        authority: program.provider.publicKey,
      })
      .rpc();
  });

  it("Modify Expense", async () => {
    await program.methods
      .modifyExpense(new anchor.BN(id), merchantName2, new anchor.BN(amount2))
      .accounts({
        expenseAccount: expense_account,
        authority: program.provider.publicKey,
      })
      .rpc();
  });

  it("Fetch Expense", async () => {
    const expenses = await program.account.expenseAccount.all([
      {
        memcmp: {
          offset: 8 + 8,
          bytes: program.provider.publicKey.toBase58(),
        },
      },
    ]);
  });

  it("Delete Expense", async () => {
    await program.methods
      .deleteExpense(new anchor.BN(id))
      .accounts({
        expenseAccount: expense_account,
        authority: program.provider.publicKey,
      })
      .rpc();
  });
});
