import React from "react";
import { Link } from "@reach/router";

// Classes
export const primaryButtonClasses =
  "bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded";
export const secondaryButtonClasses =
  "border border-purple-700 hover:bg-purple-100 text-purple-700 font-bold py-2 px-4 rounded";

// Components
export function Button<
  T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>
>({
  primary,
  component = Link,
  ...props
}: React.ComponentProps<T> & {
  component?: T;
  primary?: boolean;
}): JSX.Element {
  const Component = component;
  return (
    <Component
      {...props}
      className={primary ? primaryButtonClasses : secondaryButtonClasses}
    />
  );
}

export const Checkbox: React.FC<{
  label: string;
} & JSX.IntrinsicElements["input"]> = ({ label, ...props }) => (
  <label className="block text-gray-800 font-bold">
    <input {...props} className="mr-2 leading-tight" type="checkbox" />
    <span className="text-sm">{label}</span>
  </label>
);

export const Card: React.FC = props => (
  <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4" {...props} />
);

export const TextInput: React.FC<{ label?: string } & React.InputHTMLAttributes<
  HTMLInputElement
>> = ({ label, ...props }) => (
  <label className="md:flex md:items-center mb-6">
    <div className="md:w-1/3">
      {label && (
        <span className="block text-gray-600 font-bold mb-1 md:mb-0 pr-4">
          {label}
        </span>
      )}
    </div>
    <div className="md:w-2/3">
      <input
        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        type="text"
        {...props}
      />
    </div>
  </label>
);
