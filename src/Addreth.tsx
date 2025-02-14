import type { ForwardedRef, ReactElement, ReactNode } from "react";
import type { Address, Config, ExplorerLink, Font, ThemeDeclaration } from "./types";

import { blo } from "blo";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as styles from "./Addreth.css";
import { AddrethPopup } from "./AddrethPopup";
import { ConfigProvider, useExtendConfig } from "./Config";
import { CopyButton } from "./CopyButton";
import { Ens, useEnsResolved } from "./Ens";
import { LinkButton } from "./LinkButton";
import { useImageLoaded } from "./use-image-loaded";
import { useInjectCss } from "./use-inject-css";
import { useSsr } from "./use-ssr";
import { externalLinkAttributes, shortenAddress } from "./utils";

export type AddrethProps = {
  address: Address;

  actions?: "all" | "copy" | "explorer" | "none";

  // Alias to disable ENS on the icon and label (default: true).
  ens?: boolean;

  // Generate the name and account URL of a network explorer
  explorer?: (address: Address) => ExplorerLink;

  // Fonts
  font?: string | Font;
  fontMono?: string | Font;

  // The badge icon (default: "ens" if `ens` is true, "identicon" otherwise).
  icon?:
    // ENS avatar, falls back to "identicon" if not available
    | "ens"
    // Identicon corresponding to the address
    | "identicon"
    // no icon
    | false
    | null
    // custom icon element (element) or URL (string)
    | ((address: Address) => ReactElement | string);

  // The badge label (default: "ens" if `ens` is true, "address" otherwise).
  label?:
    | "ens"
    | "address"
    // custom label
    | ((address: Address) => ReactNode);

  // Maximum width of the badge.
  maxWidth?: number | string;

  // The node used to render the popup (default: document.body).
  popupNode?: HTMLElement;

  // Number of first & last characters to show for the address (default: 4).
  // Set to `false` to display the full address.
  shortenAddress?: number | false;

  // The ID attribute to use for the style element (default: "addreth-styles").
  stylesId?: string;

  // Theme name or a custom theme (default: "light").
  theme?: ThemeDeclaration;

  // Whether to display the label underlined (default: false).
  underline?: boolean;

  // Whether to display the label in uppercase (default: false).
  uppercase?: boolean;
};

const AddrethWrapped = forwardRef(function AddrethWrapped({
  address,
  config,
}: {
  address: AddrethProps["address"];
  config: Config;
}, ref: ForwardedRef<HTMLButtonElement>) {
  useInjectCss(config.stylesId);

  const ssr = useSsr();
  const [opened, setOpened] = useState(false);
  const ens = useEnsResolved();

  const { icon, label, theme: th, shortenAddress: shortenAddress_ } = config;

  const customBadgeIcon = typeof icon === "function" && icon(address);

  const iconSrc = useMemo(() => {
    if (typeof customBadgeIcon === "string") return customBadgeIcon;
    if (icon === "ens") return ens.avatar ?? blo(address);
    if (icon === "identicon") return blo(address);
    if (typeof icon === "string") return icon;
    return null;
  }, [address, ens, icon, customBadgeIcon]);

  const iconLoaded = useImageLoaded(iconSrc);

  const labelNode = useMemo(() => {
    if (label === "ens" && ens.name) return ens.name;
    if (typeof label === "function") return label(address);
    return shortenAddress(address, shortenAddress_ || 40);
  }, [address, ens, label, shortenAddress_]);

  const explorer = config.explorer(address);

  const popupTarget = useRef(null);
  useImperativeHandle<HTMLElement | null, HTMLElement | null>(
    ref,
    () => popupTarget.current,
  );

  const outline = {
    borderRadius: th.badgeRadius,
    outlineColor: th.focusColor,
  };
  const buttonHeight = th.badgeHeight - th.badgePadding * 2;
  const transparent = (
    th.badgeBackground === "transparent" || th.badgeBackground === "none"
  );
  const unified = th.badgeGap === 0 && !transparent;

  if (ssr) {
    return (
      <a
        href={explorer.accountUrl}
        title={address}
        {...externalLinkAttributes}
      >
        {labelNode}
      </a>
    );
  }

  return (
    <ConfigProvider {...config}>
      <span
        ref={popupTarget}
        className={styles.main}
        style={{
          gap: th.badgeGap,
          maxWidth: config.maxWidth,
          height: buttonHeight, // styles.main is not using border-box
          color: th.textColor,
          padding: th.badgePadding,
          fontSize: th.fontSize,
        }}
      >
        <button
          className={[
            styles.addressButton,
            unified ? styles.addressButtonUnified : "",
          ].join(" ")}
          onClick={() => {
            setOpened(true);
          }}
          title={address}
          style={{
            gap: th.badgeGap,
            ...config.fontMono,
          }}
        >
          {unified && (
            <div
              className={styles.badgeBackground}
              style={{
                background: th.badgeBackground,
                borderRadius: th.badgeRadius,
              }}
            />
          )}
          <div
            className={styles.badgeIconLabel}
            style={{
              gap: th.badgeGap,
              ...outline,
            }}
          >
            {(iconSrc || customBadgeIcon) && (
              iconSrc
                ? (
                  <img
                    alt=""
                    width={buttonHeight}
                    src={iconLoaded && iconSrc || blo(address)}
                    style={{
                      width: transparent ? "1.3em" : undefined,
                      borderRadius: th.badgeIconRadius ?? th.badgeRadius,
                    }}
                  />
                )
                : customBadgeIcon
            )}
            <div
              className={styles.label}
              style={{
                textTransform: config.uppercase ? "uppercase" : "none",
                textDecoration: config.underline ? "underline" : "none",
                background: unified ? "none" : th.badgeBackground,
                borderRadius: th.badgeRadius,
                padding: `0 ${th.badgeLabelPadding}px`,
              }}
            >
              <span className={styles.labelIn}>{labelNode}</span>
            </div>
          </div>
        </button>
        {["all", "copy"].includes(config.actions) && (
          <CopyButton
            content={label === "ens" && ens.name || address}
            label={label === "ens" && ens.name || "address"}
            theme={th}
            style={{
              width: buttonHeight,
              background: unified ? "none" : th.badgeBackground,
              ...outline,
            }}
          />
        )}
        {["all", "explorer"].includes(config.actions) && (
          <LinkButton
            explorer={explorer}
            theme={th}
            style={{
              width: buttonHeight,
              background: unified ? "none" : th.badgeBackground,
              ...outline,
            }}
          />
        )}
        {typeof document === "undefined" ? null : createPortal(
          <AddrethPopup
            address={address}
            explorer={explorer}
            onClose={() => {
              setOpened(false);
            }}
            target={popupTarget}
            show={opened}
          />,
          config.popupNode ?? document.body,
        )}
      </span>
    </ConfigProvider>
  );
});

export const Addreth = forwardRef(function Addreth(
  props: AddrethProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const config = useExtendConfig(props);
  return (
    <Ens
      address={props.address}
      fetch={{
        avatar: config.icon === "ens",
        name: config.label === "ens",
      }}
    >
      <AddrethWrapped
        ref={ref}
        address={props.address}
        config={config}
      />
    </Ens>
  );
});
