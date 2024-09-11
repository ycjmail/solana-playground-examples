import * as anchor from "@coral-xyz/anchor";
import type { ZeroCopy } from "../target/types/zero_copy";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.ZeroCopy as anchor.Program<ZeroCopy>;

// Please run the tests for this example. 
// Just type "test" in the console on the bottom