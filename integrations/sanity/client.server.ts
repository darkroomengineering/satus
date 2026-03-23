import { env } from "~/env.server";
import { client } from "./client";

export const serverClient = client.withConfig({
  token: env.SANITY_API_READ_TOKEN || "",
  useCdn: false,
});
