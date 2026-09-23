import { Geltre } from "../dist/index.js";

const client = new Geltre({ apiKey: process.env.GELTRE_API_KEY });

const result = await client.orient({
  task: "Determine whether the target service should restart after failure",
  state: [
    {
      ref: "context:1",
      source: "context",
      text: "target service expected mode running; restart policy on failure",
    },
    {
      ref: "context:2",
      source: "context",
      text: "target service failed after the latest start attempt",
    },
    { ref: "status:1", source: "status", text: "unit status exit code 1" },
    {
      ref: "meta:1",
      source: "meta",
      text: "distractor service backup completed successfully",
    },
  ],
  budget: 2,
});

console.log(result);
