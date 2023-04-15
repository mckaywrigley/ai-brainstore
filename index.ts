import chalk from "chalk";
import { ChromaClient, Collection, OpenAIEmbeddingFunction } from "chromadb";
import * as console from "console";
import * as dotenv from "dotenv";
import * as readline from "readline";
import { answerFromMemory, answerFromSearch, checkForBrain } from "./utils/index.js";

dotenv.config();

(async () => {
  const client = new ChromaClient();

  const embedder = new OpenAIEmbeddingFunction(process.env.OPENAI_API_KEY);

  const brain: Collection = await checkForBrain(client, embedder);
  console.log(chalk.yellow(`Starting number of memories: ${await brain.count()}\n`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(chalk.green("What would you like to know?\n"), async (input) => {
    console.log(chalk.yellow(`Recalling...\n`));
    const memoryAnswer = await answerFromMemory(brain, input);

    if (memoryAnswer.includes("INSUFFICIENT_DATA")) {
      console.log(chalk.yellow(`Learning...\n`));
      const searchAnswer = await answerFromSearch(brain, input);
      console.log(chalk.green(`${searchAnswer}\n`));
    } else {
      console.log(chalk.green(`${memoryAnswer}\n`));
    }

    console.log(chalk.yellow(`Updated number of memories: ${await brain.count()}\n`));
  });
})();
