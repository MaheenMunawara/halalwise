import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

const rl = readline.createInterface({
  input,
  output,
});

const email = (
  await rl.question("Enter the HalalWise account email: ")
)
  .trim()
  .toLowerCase();

rl.close();

if (!email) {
  throw new Error("Email is required.");
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db("halalwise");
  const users = db.collection("users");

  const user = await users.findOne({ email });

  if (!user) {
    console.log("No user found with that email.");
    process.exitCode = 1;
  } else {
    await users.updateOne(
      { email },
      {
        $set: {
          role: "finance_reviewer",
          updatedAt: new Date(),
        },
      }
    );

    console.log("");
    console.log("Finance reviewer role assigned successfully.");
    console.log("The account can now be used for finance verification.");
  }
} finally {
  await client.close();
}