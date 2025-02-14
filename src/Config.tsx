import type { ReactNode } from "react";
import type { AddrethProps } from "./Addreth";
import type { Font } from "./types";

import { createContext, useContext } from "react";
import { getTheme } from "./theme";

type ConfigProps = Omit<AddrethProps, "address">;

const ConfigContext = createContext<ConfigProps>({});

export function ConfigProvider({
  children,
  ...config
}: Omit<AddrethProps, "address"> & { children: ReactNode }) {
  return (
    <ConfigContext.Provider
      value={{
        ...useContext(ConfigContext),
        ...config,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

function parseFont(font: Font | string): Font {
  return typeof font === "string"
    ? { fontFamily: font, fontWeight: "400" }
    : font;
}

export function useExtendConfig(props?: ConfigProps) {
  const config = {
    ...useContext(ConfigContext),
    ...props,
  };
  const font = parseFont(config.font ?? "inherit");
  return {
    ...config,
    actions: config.actions ?? "all",
    explorer: config.explorer ?? ((address) => ({
      accountUrl: `https://etherscan.io/address/${address}`,
      name: "Etherscan",
    })),
    font,
    fontMono: parseFont(config.fontMono ?? font),
    icon: config.icon ?? (config.ens === false ? "identicon" : "ens"),
    label: config.label ?? (config.ens === false ? "address" : "ens"),
    shortenAddress: config.shortenAddress ?? 4,
    theme: getTheme(config.theme),
  };
}

export type Config = ReturnType<typeof useExtendConfig>;
