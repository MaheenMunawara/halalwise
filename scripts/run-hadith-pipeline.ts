import { spawn } from "child_process";

function runScript(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("");
    console.log("=================================");
    console.log(`RUNNING: ${script}`);
    console.log("=================================");
    console.log("");

    const process = spawn(
      "npx",
      ["tsx", `scripts/${script}`],
      {
        stdio: "inherit",
        shell: true,
      }
    );

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${script} failed with exit code ${code}`
          )
        );
      }
    });

    process.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log("");
  console.log("=================================");
  console.log("HALALWISE KNOWLEDGE PIPELINE");
  console.log("=================================");

  try {
    // Step 1: Ingest verified Hadith
    await runScript("ingest-hadith-batch.ts");

    // Step 2: Verify knowledge records
    await runScript("verify-hadith-batch.ts");

    console.log("");
    console.log("=================================");
    console.log("PIPELINE COMPLETE");
    console.log("=================================");
    console.log("✓ Hadith ingestion completed");
    console.log("✓ Batch verification completed");
    console.log("✓ Knowledge base is ready");
    console.log("=================================");
  } catch (error) {
    console.error("");
    console.error("=================================");
    console.error("PIPELINE FAILED");
    console.error("=================================");
    console.error(error);
    console.error("=================================");

    process.exit(1);
  }
}

main();