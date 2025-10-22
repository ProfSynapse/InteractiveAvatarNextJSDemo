import React from "react";

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, className, onClick, ...props }) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg bg-[#b87241] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#9d6136] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={props.disabled ? undefined : onClick}
      {...props}
    >
      {children}
    </button>
  );
};
