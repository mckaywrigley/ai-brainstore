import chalk from "chalk";
import { ChromaClient, Collection, OpenAIEmbeddingFunction } from "chromadb";
import * as console from "console";
import * as dotenv from "dotenv";
import * as readline from "readline";
import { addMemory, answerFromMemory, answerFromSearch, checkForBrain } from "./utils/index.js";

dotenv.config();

(async () => {
  const client = new ChromaClient();
  const embedder = new OpenAIEmbeddingFunction(process.env.OPENAI_API_KEY);

  // await client.deleteCollection(process.env.COLLECTION_NAME); // ONLY UNCOMMENT IF YOU WANT TO RESET THE BRAIN

  const brain: Collection = await checkForBrain(client, embedder);
  console.log(chalk.yellow(`\nMemory count: ${await brain.count()}\n`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    rl.question(chalk.blue("\nWhat would you like to know?\n"), async (input) => {
      console.log(chalk.yellow(`\nRecalling...\n`));
      const memoryAnswer = await answerFromMemory(brain, input);

      if (memoryAnswer.includes("INSUFFICIENT_DATA")) {
        console.log(chalk.yellow(`\nInsuffient memories. Now learning...\n`));
        const searchAnswer = await answerFromSearch(brain, input);
        console.log(chalk.green(`${searchAnswer}\n`));

        console.log(chalk.yellow(`\nAdding memory...\n`));

        if (process.env.REVIEW_MEMORIES) {
          rl.question(chalk.blue("\nIs this answer accurate? (y/n)\n"), async (review) => {
            if (review === "y") {
              await addMemory(brain, searchAnswer);
              console.log(chalk.yellow(`\nAdded memory!\n`));
            } else {
              console.log(chalk.yellow(`\nMemory discarded.\n`));
            }
            askQuestion();
          });
        } else {
          await addMemory(brain, searchAnswer);
          console.log(chalk.yellow(`\nAdded memory!\n`));
          askQuestion();
        }

        askQuestion();
      } else {
        console.log(chalk.green(`\n${memoryAnswer}\n`));
        askQuestion();
      }
    });
  };

  askQuestion();
})();
