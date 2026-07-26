"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: "gilt" | "forest" | "ghost" | "plain";
  size?: "sm" | "md" | "lg";
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  type?: "button" | "submit" | "reset";
};

// Port of the design system's Button.jsx — primary action element with
// three variants (gilt gilded chip, forest moss-filled, ghost line).
export default function Button({
  variant = "gilt",
  size = "md",
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  children,
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  const classes = [styles.base, styles[size], styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} disabled={disabled} className={classes} {...rest}>
      {leadingIcon}
      <span>{children}</span>
      {trailingIcon}
    </button>
  );
}
