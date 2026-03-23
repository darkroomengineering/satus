import type { CustomAtRules, Function as LightningCssFunction, Visitor } from "lightningcss";

function buildFunction(args: LightningCssFunction["arguments"], calc: (value: number) => string) {
  if (!args || args.length !== 1) {
    throw new Error(`Invalid arguments: ${JSON.stringify(args)}`);
  }

  if (args[0]?.type !== "token" || args[0]?.value?.type !== "number") {
    throw new Error(`Invalid pixel value: ${JSON.stringify(args[0]?.value)}`);
  }

  return { raw: calc(args[0].value.value) };
}

const functions: Record<string, (args: LightningCssFunction) => { raw: string }> = {
  "mobile-vw": ({ arguments: args }) =>
    buildFunction(args, (pixels) => `calc((${pixels} * 100) / var(--mobile-width) * 1vw)`),
  "mobile-vh": ({ arguments: args }) =>
    buildFunction(args, (pixels) => `calc((${pixels} * 100) / var(--mobile-height) * 1vh)`),
  "desktop-vw": ({ arguments: args }) =>
    buildFunction(args, (pixels) => `calc((${pixels} * 100) / var(--desktop-width) * 1vw)`),
  "desktop-vh": ({ arguments: args }) =>
    buildFunction(args, (pixels) => `calc((${pixels} * 100) / var(--desktop-height) * 1vh)`),
  "device-vw": ({ arguments: args }) =>
    buildFunction(args, (pixels) => `calc((${pixels} * 100) / var(--device-width) * 1vw)`),
  "device-vh": ({ arguments: args }) =>
    buildFunction(args, (pixels) => `calc((${pixels} * 100) / var(--device-height) * 1vh)`),
  columns: ({ arguments: args }) =>
    buildFunction(
      args,
      (pixels) => `calc((${pixels} * var(--column-width)) + ((${pixels} - 1) * var(--gap)))`,
    ),
};

export function lightningcssFunctions(): Visitor<CustomAtRules> {
  return {
    FunctionExit: functions,
  };
}
