import type { ToolHandlerMap } from "../lib/schemas";
import { locationHandlers } from "./locations";
import { inquiryHandlers } from "./inquiries";
import { tourQueryHandlers } from "./tour-queries";
import { customerHandlers } from "./customers";
import { supplierHandlers } from "./suppliers";
import { saleHandlers } from "./sales";
import { purchaseHandlers } from "./purchases";
import { financeHandlers } from "./finance";
import { expenseIncomeHandlers } from "./expenses-income";
import { returnHandlers } from "./returns";
import { reportingHandlers } from "./reporting";
import { configHandlers } from "./config";
import { staffHandlers } from "./staff";
import { flightHandlers } from "./flights";
import { whatsappHandlers } from "./whatsapp";
import { aiHandlers } from "./ai";
import { statsHandlers } from "./stats";

export const TOOLS: ToolHandlerMap = {
  ...locationHandlers,
  ...inquiryHandlers,
  ...tourQueryHandlers,
  ...customerHandlers,
  ...supplierHandlers,
  ...saleHandlers,
  ...purchaseHandlers,
  ...financeHandlers,
  ...expenseIncomeHandlers,
  ...returnHandlers,
  ...reportingHandlers,
  ...configHandlers,
  ...staffHandlers,
  ...flightHandlers,
  ...whatsappHandlers,
  ...aiHandlers,
  ...statsHandlers,
};
