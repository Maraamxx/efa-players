import { setupWorker } from "msw/browser";
import { playerHandlers } from "./handlers/players";

export const worker = setupWorker(...playerHandlers);
