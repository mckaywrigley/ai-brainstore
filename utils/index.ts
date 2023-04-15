import chalk from "chalk";
import { ChromaClient, Collection, OpenAIEmbeddingFunction } from "chromadb";
import { initializeAgentExecutor } from "langchain/agents";
import { VectorDBQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { SerpAPI } from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";
import { WebBrowser } from "langchain/tools/webbrowser";
import { Chroma } from "langchain/vectorstores/chroma";
import { HNSWLib } from "langchain/vectorstores/hnswlib";

export const checkForBrain = async (client: ChromaClient, embedder: OpenAIEmbeddingFunction) => {
  const collectionName = process.env.COLLECTION_NAME;
  if (!collectionName) throw new Error("COLLECTION_NAME not set in .env file.");

  const collections = await client.listCollections();
  const learningAgentCollection = collections.find((collection: Collection) => collection.name === collectionName);

  if (learningAgentCollection) {
    console.log(chalk.yellow("\nBrain found.\n"));
    return await client.getCollection(collectionName, embedder);
  } else {
    console.log(chalk.yellow("\nBrain not found. Ceating a new brain.\n"));
    const collection = await client.createCollection(collectionName, {}, embedder);
    await addTestData(collection);
    return collection;
  }
};

export const answerFromMemory = async (brain: Collection, input: string) => {
  const query = `You are given the following input: ${input}. You can only use the given documents - do not recall info from your own memory. If the given documents are sufficient for an accurate answer, then use them to give an accurate, detailed answer. If not, respond exactly with INSUFFICIENT_DATA.`;

  let memoryCount = await brain.count();
  if (memoryCount > 5) {
    memoryCount = 5;
  }

  const chromaStore = await Chroma.fromExistingCollection(new OpenAIEmbeddings(), {
    collectionName: brain.name
  });
  const chromaRes = await chromaStore.similaritySearch(input, memoryCount);

  const model = new ChatOpenAI({ temperature: 0, maxTokens: 2000 });

  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
  const docs = await textSplitter.createDocuments(chromaRes.map((doc) => doc.pageContent));

  const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
  const chain = VectorDBQAChain.fromLLM(model, vectorStore);

  const res = await chain.call({
    query
  });

  return res.text;
};

export const answerFromSearch = async (brain: Collection, input: string) => {
  const inputPlus = `Find an answer to the following input: ${input}. Respond in a complete sentence that reiterates the input and provides an accurate, detailed answer.`;

  const model = new ChatOpenAI({ temperature: 0 });
  const embeddings = new OpenAIEmbeddings();

  const tools = [new WebBrowser({ model, embeddings }), new Calculator()];

  if (process.env.SERPAPI_API_KEY) {
    tools.push(new SerpAPI(process.env.SERPAPI_API_KEY));
  }

  const executor = await initializeAgentExecutor(tools, model, "chat-zero-shot-react-description");

  try {
    const result = await executor.call({ input: inputPlus });
    return result.output;
  } catch (e) {
    console.log(chalk.red("\nI made mistake. Trying again..."));
    return answerFromSearch(brain, input);
  }
};

export const addMemory = async (brain: Collection, memory: string) => {
  const memoryCount = await brain.count();

  await brain.add(memoryCount.toString(), undefined, {}, memory);
};

const addTestData = async (collection: any) => {
  // add test data
  await collection.add(
    ["1", "2"],
    undefined,
    [{}, {}],
    [
      // Julius Caesar
      `Gaius Julius Caesar (/ˈsiːzər/; Latin: [ˈɡaːiʊs ˈjuːliʊs ˈkae̯sar]; 12 July 100 BC – 15 March 44 BC) was a Roman general and statesman. A member of the First Triumvirate, Caesar led the Roman armies in the Gallic Wars before defeating his political rival Pompey in a civil war, and subsequently became dictator from 49 BC until his assassination in 44 BC. He played a critical role in the events that led to the demise of the Roman Republic and the rise of the Roman Empire.
      
            In 60 BC, Caesar, Crassus, and Pompey formed the First Triumvirate, an informal political alliance that dominated Roman politics for several years. Their attempts to amass power as Populares were opposed by the Optimates within the Roman Senate, among them Cato the Younger with the frequent support of Cicero. Caesar rose to become one of the most powerful politicians in the Roman Republic through a string of military victories in the Gallic Wars, completed by 51 BC, which greatly extended Roman territory. During this time he both invaded Britain and built a bridge across the Rhine river. These achievements and the support of his veteran army threatened to eclipse the standing of Pompey, who had realigned himself with the Senate after the death of Crassus in 53 BC. With the Gallic Wars concluded, the Senate ordered Caesar to step down from his military command and return to Rome. In 49 BC, Caesar openly defied the Senate's authority by crossing the Rubicon and marching towards Rome at the head of an army.[3] This began Caesar's civil war, which he won, leaving him in a position of near unchallenged power and influence in 45 BC.
            
            After assuming control of government, Caesar began a program of social and governmental reforms, including the creation of the Julian calendar. He gave citizenship to many residents of far regions of the Roman Republic. He initiated land reform and support for veterans. He centralized the bureaucracy of the Republic and was eventually proclaimed "dictator for life" (dictator perpetuo). His populist and authoritarian reforms angered the elites, who began to conspire against him. On the Ides of March (15 March) 44 BC, Caesar was assassinated by a group of rebellious senators led by Brutus and Cassius, who stabbed him to death.[4][5] A new series of civil wars broke out and the constitutional government of the Republic was never fully restored. Caesar's great-nephew and adopted heir Octavian, later known as Augustus, rose to sole power after defeating his opponents in the last civil war of the Roman Republic. Octavian set about solidifying his power, and the era of the Roman Empire began.
            
            Caesar was an accomplished author and historian as well as a statesman; much of his life is known from his own accounts of his military campaigns. Other contemporary sources include the letters and speeches of Cicero and the historical writings of Sallust. Later biographies of Caesar by Suetonius and Plutarch are also important sources. Caesar is considered by many historians to be one of the greatest military commanders in history.[6] His cognomen was subsequently adopted as a synonym for "Emperor"; the title "Caesar" was used throughout the Roman Empire, giving rise to modern descendants such as Kaiser and Tsar. He has frequently appeared in literary and artistic works, and his political philosophy, known as Caesarism, has inspired politicians into the modern era.`,

      // Alexander the Great
      `Alexander III of Macedon (Ancient Greek: Ἀλέξανδρος, romanized: Alexandros; 20/21 July 356 BC – 10/11 June 323 BC), commonly known as Alexander the Great,[a] was a king of the ancient Greek kingdom of Macedon.[a] He succeeded his father Philip II to the throne in 336 BC at the age of 20, and spent most of his ruling years conducting a lengthy military campaign throughout Western Asia and Egypt. By the age of 30, he had created one of the largest empires in history, stretching from Greece to northwestern India.[2] He was undefeated in battle and is widely considered to be one of history's greatest and most successful military commanders.[3][4]
      
          Until the age of 16, Alexander was tutored by Aristotle. In 335 BC, shortly after his assumption of kingship over Macedon, he campaigned in the Balkans and reasserted control over Thrace and Illyria before marching on the city of Thebes, which was subsequently destroyed in battle. Alexander then led the League of Corinth, and used his authority to launch the pan-Hellenic project envisaged by his father, assuming leadership over all Greeks in their conquest of Persia.[5][6]
          
          In 334 BC, he invaded the Achaemenid Persian Empire and began a series of campaigns that lasted for 10 years. Following his conquest of Asia Minor, Alexander broke the power of Achaemenid Persia in a series of decisive battles, including those at Issus and Gaugamela; he subsequently overthrew Darius III and conquered the Achaemenid Empire in its entirety.[b] After the fall of Persia, the Macedonian Empire held a vast swath of territory between the Adriatic Sea and the Indus River. Alexander endeavored to reach the "ends of the world and the Great Outer Sea" and invaded India in 326 BC, achieving an important victory over Porus, an ancient Indian king of present-day Punjab, at the Battle of the Hydaspes. Due to the demand of his homesick troops, he eventually turned back at the Beas River and later died in 323 BC in Babylon, the city of Mesopotamia that he had planned to establish as his empire's capital. Alexander's death left unexecuted an additional series of planned military and mercantile campaigns that would have begun with a Greek invasion of Arabia. In the years following his death, a series of civil wars broke out across the Macedonian Empire, eventually leading to its disintegration at the hands of the Diadochi.
          
          With his death marking the start of the Hellenistic period, Alexander's legacy includes the cultural diffusion and syncretism that his conquests engendered, such as Greco-Buddhism and Hellenistic Judaism. He founded more than twenty cities, with the most prominent being the city of Alexandria in Egypt. Alexander's settlement of Greek colonists and the resulting spread of Greek culture led to the overwhelming dominance of Hellenistic civilization and influence as far east as the Indian subcontinent. The Hellenistic period developed through the Roman Empire into modern Western culture; the Greek language became the lingua franca of the region and was the predominant language of the Byzantine Empire up until its collapse in the mid-15th century AD. Greek-speaking communities in central Anatolia and in far-eastern Anatolia survived until the Greek genocide and Greek–Turkish population exchanges of the early 20th century AD. Alexander became legendary as a classical hero in the mould of Achilles, featuring prominently in the historical and mythical traditions of both Greek and non-Greek cultures. His military achievements and unprecedented enduring successes in battle made him the measure against which many later military leaders would compare themselves,[c] and his tactics remain a significant subject of study in military academies worldwide.[7]`
    ]
  );
};
