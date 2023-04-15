# Learning Agent

This is a simple AI agent that learns about whatever you want it to learn about.

See a [demo](https://twitter.com/mckaywrigley/status/1640380021423603713?s=46&t=AowqkodyK6B4JccSOxSPew).

![Chatbot UI](./public/screenshots/screenshot-0402023.jpg)

## How It Works

**Learn Mode**

The agent takes in a topic, browses the web, and then uses GPT-3.5-turbo to synthesize a summary of the topic.

It stores its new knowledge in a vector database for future retrieval.

**Question Mode**

The agent takes in a question and uses the vector database to find the most relevant knowledge to answer the question.

If the agent doesn't know the answer, it will automatically switch to learn mode and learn about the topic.

## Running Locally

**1. Clone Repo**

## Running Locally

**1. Clone Repo**

```bash
git clone https://github.com/mckaywrigley/chatbot-ui.git
```

**2. Install Dependencies**

```bash
npm i
```

**3. Provide API Keys**

Create a .env.local file in the root of the repo with the following API Keys:

```bash
OPENAI_API_KEY=YOUR_KEY_HERE

GOOGLE_API_KEY=YOUR_KEY_HERE
GOOGLE_CSE_ID=YOUR_KEY_HERE
```

> You can set `OPENAI_API_HOST` where access to the official OpenAI host is restricted or unavailable, allowing users to configure an alternative host for their specific needs.

> Additionally, if you have multiple OpenAI Organizations, you can set `OPENAI_ORGANIZATION` to specify one.

**4. Install Chroma**

You will need Docker installed to run Chroma.

```bash

```

**5. Run Script**

```bash
npm run start
```

**6. Use It**

You can now tell the agent what to learn about and it will learn about it.

## Contact

If you have any questions, feel free to reach out to me on [Twitter](https://twitter.com/mckaywrigley).
