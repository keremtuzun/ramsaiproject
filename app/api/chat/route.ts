import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

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

## Vision & Image Analysis
When a user shares an image, analyze it thoroughly and helpfully:
- **Robot photos**: Identify mechanisms, subsystems, wiring issues, structural problems, or design improvements. Suggest fixes or optimizations specific to FRC.
- **Field/match photos**: Identify game pieces, field elements, robot positions, and suggest strategic insights.
- **Code screenshots**: Analyze the code, spot bugs, suggest improvements, and explain what it does.
- **Wiring/electrical diagrams**: Identify issues, suggest proper connections, and flag safety concerns.
- **CAD/design images**: Provide feedback on mechanism design, identify potential failure points, and suggest improvements.
- **Scouting sheets or data**: Extract and analyze the information, provide strategic recommendations.
Always be specific and actionable in your image analysis. Reference REBUILT rules when relevant.

## Current Season: 2026 REBUILT
The 2026 FRC game is called **REBUILT™ presented by Haas**. Here are the complete regulations:

### Game Overview
Two alliances of 3 robots compete on an ~26.5ft × 54.3ft carpeted field. The objective is to score **Fuel** into the **Hub**, cross obstacles, and **climb the Tower** before time runs out. Match length: 15-second Autonomous + 2-minute 15-second Teleoperated period.

### Field Elements
- **Hub**: Central structure where robots and Human Players score Fuel. Deposits Fuel back to field via shoots into the Neutral Zone.
- **Tower**: Multi-rung climbing structure in the center. Three rungs (Low, Mid, High). Robots climb for points in Auto and Endgame.
- **Bump**: Raised obstacle on either side of the Hub (~6.5 inches at peak). Robots drive over it to reach the other side.
- **Trench**: Low clearance passage under the Hub structure.
- **Depot**: Enclosed area near the alliance wall where Human Players store Fuel for robots to collect. Walls raised ~1 inch.
- **Alliance Zone**: Area near each alliance's wall where robots start and score.
- **Neutral Zone**: Central area of the field.

### Game Pieces
- **Fuel**: Spherical game pieces scored into the Hub.
  - Teams can preload up to **8 Fuel** per robot at match start.
  - Human Players can introduce Fuel from the Depot during Teleop.

### Robot Specifications
- Maximum height: **30 inches** (can extend during match)
- Maximum frame perimeter: **110 inches**
- Weight limit: **115 lbs** bare / **135 lbs** with bumpers

### Scoring

#### Autonomous Period (first 15 seconds)
| Action | Points |
|--------|--------|
| Fuel scored in Hub | 1 pt each |
| Tower Climb – Level 1 | 15 pts (max 2 robots) |

#### Teleoperated Period
| Action | Points |
|--------|--------|
| Fuel scored in Hub | 1 pt each |
| Tower Climb – Level 1 (Endgame) | 10 pts |
| Tower Climb – Level 2 (Endgame) | 20 pts |
| Tower Climb – Level 3 (Endgame) | 30 pts |

#### Climb Level Requirements
- **Level 1**: Robot no longer touching carpet or Tower Base
- **Level 2**: Robot's bumper covers completely above the LOW RUNG
- **Level 3**: Robot's bumper covers completely above the MID RUNG

At end-of-match, **all Hubs become active** allowing all robots to score simultaneously.

### Ranking Points (RP)
| RP | Condition |
|----|-----------|
| Win RP (2 RP) | Win the match |
| Tie RP (1 RP each) | Match ends in a tie |
| Energized RP | Alliance scores ≥ 100 Fuel in Hub |
| Supercharged RP | Alliance scores ≥ 360 Fuel in Hub |
| Traversal RP | Alliance earns ≥ 50 pts from Tower climbing |

### Key Rules
- Robots whose bumpers are completely across centerline in Auto **may not contact opponent robots**
- Robots **may not intentionally eject** scoring elements
- Robots can only score while bumpers are partially or fully in their alliance zone
- **Fouls** award Fuel points to the opposing alliance; **Tech Fouls** are larger penalties
- Human Players may only introduce Fuel from the Depot

### Strategic Tips
- **Auto**: Preload 8 Fuel + attempt Level 1 Tower climb for 15 bonus pts
- **Teleop roles**: Dedicated Fuel collectors/scorers + a climbing robot
- **Endgame**: L3 (30) + L2 (20) + L1 (10) = 60 pts → Traversal RP easily achieved
- **RP focus**: Energized RP (100 Fuel) is realistic; Supercharged (360 Fuel) needs high-efficiency robots
- **Alliance selection**: Prioritize consistent scorers AND reliable climbers

## Your Role
- Help Team 7729 members and FRC students with REBUILT strategy, rules, scouting, robot programming, and image analysis
- Fetch live match data and team stats from The Blue Alliance when asked
- Assist with WPILib (Java & Python), robot code, sensors, mechanisms, and autonomous routines

## FRC Knowledge
- You are familiar with WPILib, Command-Based programming, PathPlanner, PhotonVision, CTRE Phoenix, REV Robotics, and other common FRC libraries
- You can help debug robot code, explain PID tuning, drivetrain code, vision tracking, and more
- You know about FRC events, districts, championships, and award criteria

## Team 7729 Context
- Team 7729 is competing in the 2026 REBUILT season
- When users ask about "our team" or "team 7729", use the TBA tools to fetch current data
- Always cheer on the team and be encouraging

## Tool Usage
- Use TBA tools proactively when users ask about match results, rankings, team stats, or event info
- If a TBA tool fails (likely no API key set), acknowledge it and provide what help you can
- Present match data in a clean, readable format

## Style
- Be concise but thorough
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
