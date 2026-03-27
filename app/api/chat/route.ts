import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

async function tbaFetch(path: string) {
  const key = process.env.TBA_API_KEY;
  if (!key) throw new Error("TBA_API_KEY not set");
  const res = await fetch(`${TBA_BASE}${path}`, {
    headers: { "X-TBA-Auth-Key": key },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`TBA error ${res.status}: ${res.statusText}`);
  return res.json();
}

const tools: Anthropic.Tool[] = [
  {
    name: "get_team_info",
    description:
      "Fetch basic info about an FRC team (name, location, rookie year, etc.) from The Blue Alliance.",
    input_schema: {
      type: "object" as const,
      properties: {
        team_number: {
          type: "number",
          description: "The FRC team number (e.g. 7729)",
        },
      },
      required: ["team_number"],
    },
  },
  {
    name: "get_team_events",
    description:
      "Get all events an FRC team is attending or attended in a given year.",
    input_schema: {
      type: "object" as const,
      properties: {
        team_number: { type: "number", description: "FRC team number" },
        year: {
          type: "number",
          description: "Season year (e.g. 2025). Defaults to current year.",
        },
      },
      required: ["team_number"],
    },
  },
  {
    name: "get_team_event_matches",
    description: "Get all matches a team played at a specific event.",
    input_schema: {
      type: "object" as const,
      properties: {
        team_number: { type: "number", description: "FRC team number" },
        event_key: {
          type: "string",
          description:
            "TBA event key (e.g. '2025mnmi' for 2025 Minnesota 10000 Lakes Regional)",
        },
      },
      required: ["team_number", "event_key"],
    },
  },
  {
    name: "get_event_rankings",
    description: "Get team rankings at an FRC event.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_key: {
          type: "string",
          description: "TBA event key (e.g. '2025mnmi')",
        },
      },
      required: ["event_key"],
    },
  },
  {
    name: "get_team_awards",
    description: "Get awards won by an FRC team in a given year.",
    input_schema: {
      type: "object" as const,
      properties: {
        team_number: { type: "number", description: "FRC team number" },
        year: { type: "number", description: "Season year (optional)" },
      },
      required: ["team_number"],
    },
  },
  {
    name: "search_teams_at_event",
    description:
      "Get a list of all teams competing at a specific FRC event.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_key: { type: "string", description: "TBA event key" },
      },
      required: ["event_key"],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "get_team_info": {
        const data = await tbaFetch(`/team/frc${input.team_number}`);
        return JSON.stringify(data, null, 2);
      }
      case "get_team_events": {
        const year = input.year ?? new Date().getFullYear();
        const data = await tbaFetch(
          `/team/frc${input.team_number}/events/${year}`
        );
        return JSON.stringify(data, null, 2);
      }
      case "get_team_event_matches": {
        const data = await tbaFetch(
          `/team/frc${input.team_number}/event/${input.event_key}/matches`
        );
        return JSON.stringify(data, null, 2);
      }
      case "get_event_rankings": {
        const data = await tbaFetch(`/event/${input.event_key}/rankings`);
        return JSON.stringify(data, null, 2);
      }
      case "get_team_awards": {
        const path = input.year
          ? `/team/frc${input.team_number}/awards/${input.year}`
          : `/team/frc${input.team_number}/awards`;
        const data = await tbaFetch(path);
        return JSON.stringify(data, null, 2);
      }
      case "search_teams_at_event": {
        const data = await tbaFetch(`/event/${input.event_key}/teams`);
        return JSON.stringify(data, null, 2);
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({
      error: (err as Error).message,
      note: "TBA_API_KEY may not be set or the endpoint may be unavailable.",
    });
  }
}

const SYSTEM_PROMPT = `You are RAMS AI — the official AI assistant for FRC Team 7729. You are knowledgeable, enthusiastic, and helpful for all things FIRST Robotics Competition.

## Current Season: 2026 REBUILT
The 2026 FRC game is called REBUILT. Help users understand its rules, game pieces, field elements, scoring, ranking points, and optimal strategies for this game. When asked about REBUILT, provide detailed, accurate information about game mechanics, auto period strategies, teleop strategies, and endgame.

## Your Role
- Help Team 7729 members and FRC students with REBUILT strategy, rules, scouting, and robot programming
- Fetch live match data and team stats from The Blue Alliance when asked
- Assist with WPILib (Java & Python), robot code, sensors, mechanisms, and autonomous routines
- Explain REBUILT game rules clearly and provide strategic advice for alliance selection and match play

## FRC Knowledge
- You know FRC rules, game mechanics, scoring systems, and common strategies for REBUILT and past games
- You are familiar with WPILib, Command-Based programming, PathPlanner, PhotonVision, CTRE Phoenix, REV Robotics, and other common FRC libraries
- You can help debug robot code, explain PID tuning, help with drivetrain code, vision tracking, and more
- You know about FRC events, districts, championships, and award criteria

## Team 7729 Context
- Team 7729 is a FIRST Robotics Competition team competing in the 2026 REBUILT season
- When users ask about "our team" or "team 7729", use the TBA tools to fetch current data
- Always cheer on the team and be encouraging

## Tool Usage
- Use TBA tools proactively when users ask about match results, rankings, team stats, or event info
- If a TBA tool fails (likely no API key set), acknowledge it and provide what help you can without the data
- When showing match data, present it in a clean, readable format

## Style
- Be concise but thorough — don't pad responses unnecessarily
- Use code blocks for all code snippets
- Use markdown formatting for lists, headers, and emphasis
- Be encouraging and enthusiastic about robotics!`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) =>
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      try {
        // Agentic loop: keep running until no more tool calls
        let currentMessages = [...messages];
        let assistantText = "";

        while (true) {
          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools,
            messages: currentMessages,
          });

          // Collect text and tool use blocks
          const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
          for (const block of response.content) {
            if (block.type === "text") {
              assistantText += block.text;
              send(JSON.stringify({ type: "text", text: block.text }));
            } else if (block.type === "tool_use") {
              toolUseBlocks.push(block);
              send(
                JSON.stringify({
                  type: "tool_use",
                  name: block.name,
                  id: block.id,
                })
              );
            }
          }

          if (
            response.stop_reason === "end_turn" ||
            toolUseBlocks.length === 0
          ) {
            break;
          }

          // Execute tools and continue
          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: response.content },
          ];

          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (block) => {
              const result = await executeTool(
                block.name,
                block.input as Record<string, unknown>
              );
              send(
                JSON.stringify({ type: "tool_result", id: block.id, result })
              );
              return {
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: result,
              };
            })
          );

          currentMessages = [
            ...currentMessages,
            { role: "user", content: toolResults },
          ];
        }

        send(JSON.stringify({ type: "done" }));
      } catch (err) {
        send(
          JSON.stringify({
            type: "error",
            message: (err as Error).message,
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
