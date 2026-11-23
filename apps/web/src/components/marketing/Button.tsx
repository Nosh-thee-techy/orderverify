/**
 * apps/web/src/components/marketing/Button.tsx
 * Landing-page button variants. Dashboard screens keep using their own green controls.
 */
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-brand-control font-semibold tracking-tight",
    "transition-[transform,background-color,box-shadow,color,border-color] duration-200 ease-brand",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-brand-orange text-white shadow-brand-orange hover:-translate-y-px hover:bg-brand-orange-deep hover:shadow-brand active:translate-y-0",
        secondary:
          "border-[1.5px] border-brand-orange bg-transparent text-brand-orange hover:bg-brand-orange hover:text-white",
        dark: "bg-brand-ink text-white hover:-translate-y-px hover:bg-[#3d182c] active:translate-y-0",
        text: "rounded-md bg-transparent px-1 text-brand-orange hover:text-brand-tangerine hover:underline hover:decoration-2 hover:underline-offset-[6px]",
      },
      size: {
        md: "min-h-12 px-5 text-[0.95rem]",
        lg: "min-h-12 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

type SharedProps = ButtonVariantProps & {
  className?: string;
  children: React.ReactNode;
};

type NativeButtonProps = SharedProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type LinkButtonProps = SharedProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> & {
    href: string;
    external?: boolean;
  };

export type ButtonProps = NativeButtonProps | LinkButtonProps;

function isLinkButton(props: ButtonProps): props is LinkButtonProps {
  return typeof props.href === "string";
}

/**
 * Primary, outlined, dark, and text buttons for the public site.
 * Pass `href` to render a Next.js link (or an external anchor when `external` is set).
 *
 * @param props.variant - Visual style
 * @param props.size - Control height and padding
 * @param props.href - Optional destination; when set the control is a link
 * @returns A button or link with the marketing styles applied
 */
export function Button(props: ButtonProps) {
  const classes = cn(buttonVariants({ variant: props.variant, size: props.size }), props.className);

  if (isLinkButton(props)) {
    const { href, external, children, variant: _variant, size: _size, className: _className, ...linkProps } = props;
    if (external) {
      return (
        <a href={href} className={classes} target="_blank" rel="noreferrer" {...linkProps}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { variant: _variant, size: _size, className: _className, children, type = "button", ...buttonProps } = props;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

export { buttonVariants };
