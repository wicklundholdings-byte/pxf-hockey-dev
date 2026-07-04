import { defineMcp } from "@lovable.dev/mcp-js";
import listPublicCamps from "./tools/list-public-camps";
import getPublicCamp from "./tools/get-public-camp";
import getPublicCoach from "./tools/get-public-coach";

export default defineMcp({
  name: "pxf-hockey-mcp",
  title: "PXF Hockey",
  version: "0.1.0",
  instructions:
    "Read-only tools for the PXF Hockey public marketplace. Use `list_public_camps` to discover live camps, `get_public_camp` for camp details by slug, and `get_public_coach` for a coach's profile and their live camps.",
  tools: [listPublicCamps, getPublicCamp, getPublicCoach],
});