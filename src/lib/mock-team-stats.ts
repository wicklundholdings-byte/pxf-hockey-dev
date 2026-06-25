import type { SkaterAgg, GoalieAgg, TeamRecord } from "./team-stats";

export const mockRecord: TeamRecord = {
  w: 7, l: 5, otw: 1, otl: 1, sow: 0, sol: 0,
  points: 16, gp: 14, gf: 42, ga: 36, diff: 6,
};

export const mockSkaters: SkaterAgg[] = [
  { team_player_id: "41041a1a-123f-4517-bd34-ff908d62f1e2", display_name: "Mason Carter", athlete_id: "0c45ba2d-4065-4271-baf3-b489d95b736a", gp: 13, g: 12, a: 14, pts: 26, pim: 4, pm: 8, sog: 48 },
  { team_player_id: "9951decf-9d61-4912-89f7-5a3dca86c825", display_name: "Liam Brooks", athlete_id: "8c8ba7a4-f77a-4009-840c-72824f187b74", gp: 13, g: 9, a: 11, pts: 20, pim: 8, pm: 5, sog: 38 },
  { team_player_id: "34af72f2-bbc1-4b1b-8371-a5818dfa7d5f", display_name: "Noah Reilly", athlete_id: "fa354668-3052-49a1-ad13-6035c59a6d47", gp: 13, g: 8, a: 7, pts: 15, pim: 2, pm: 3, sog: 32 },
  { team_player_id: "54bff179-1d6e-4619-88a1-7a27b135d46a", display_name: "Ethan Walsh", athlete_id: "4acfad34-1fcb-4c27-bc98-20eac229902b", gp: 13, g: 6, a: 6, pts: 12, pim: 0, pm: 4, sog: 28 },
  { team_player_id: "8b183e4d-54b7-4345-bd1a-1f8b76517122", display_name: "Lucas Tremblay", athlete_id: "44681457-0723-470a-a289-8635ac500944", gp: 12, g: 4, a: 5, pts: 9, pim: 8, pm: 1, sog: 22 },
  { team_player_id: "084a0966-461e-478c-997d-d80d2de2737e", display_name: "Owen Mercer", athlete_id: "cf1c6bb9-d05a-4589-bc6c-3d7137f85d44", gp: 13, g: 3, a: 5, pts: 8, pim: 0, pm: 2, sog: 18 },
  { team_player_id: "2d9ff0e4-ce4f-436c-b87c-edc3d1292ace", display_name: "Jaxon Hayes", athlete_id: "9a5bc331-3d3a-43b4-8324-4e66b6b4c8d7", gp: 11, g: 2, a: 4, pts: 6, pim: 0, pm: 0, sog: 14 },
  { team_player_id: "a376d4ac-2e8f-4914-ac7c-a0e55e029786", display_name: "Caleb Ross", athlete_id: "76ed01f7-4dac-4759-9def-f24e950cc311", gp: 12, g: 1, a: 3, pts: 4, pim: 0, pm: 1, sog: 10 },
  { team_player_id: "4808e011-2ffd-4e7c-b771-bd75969c9b3b", display_name: "Riley Tanaka", athlete_id: "46dcf433-2a84-4e6d-a167-4ebf809aeaf0", gp: 13, g: 1, a: 2, pts: 3, pim: 4, pm: 3, sog: 12 },
  { team_player_id: "fd77d778-bb97-4d8e-8106-ec2f0e283010", display_name: "Connor Park", athlete_id: "8eff6bc7-52d6-41b4-a597-414a43844cec", gp: 13, g: 0, a: 3, pts: 3, pim: 0, pm: 5, sog: 8 },
  { team_player_id: "d2e54cc4-0e73-4bb7-9f08-75eb5585c1b8", display_name: "Hayden Cole", athlete_id: "2741f468-aea0-4535-b78a-86230a61b08b", gp: 12, g: 0, a: 2, pts: 2, pim: 2, pm: 2, sog: 6 },
  { team_player_id: "31b06c3d-52ac-4bf8-a010-c57c7256713f", display_name: "Eli Sanchez", athlete_id: "71d0ec8b-8dc1-48c5-9415-a9c5c369abe3", gp: 11, g: 0, a: 1, pts: 1, pim: 0, pm: 1, sog: 4 },
];

export const mockGoalies: GoalieAgg[] = [
  { team_player_id: "76ee606a-50ba-4aae-89cc-087e72ea7ae3", display_name: "Brody Nguyen", athlete_id: "6be27918-d83b-440e-a2de-1cb6317b344b", gp: 13, w: 7, l: 5, ga: 30, saves: 325, shots: 355, so: 0 },
  { team_player_id: "7e93f439-4ac5-4ba6-b5bc-832b5fa6708d", display_name: "Logan Pearce", athlete_id: "96b11a51-9247-4602-8b41-bca606ba1de7", gp: 2, w: 0, l: 1, ga: 3, saves: 20, shots: 23, so: 0 },
];
