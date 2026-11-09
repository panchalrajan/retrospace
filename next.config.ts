import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
    // Inline Edit still imports the old capitalized Form entry points.
    resolveAlias: {
      "@atlaskit/form/Field": "@atlaskit/form/field",
      "@atlaskit/form/Form": "@atlaskit/form/form",
    },
  },
  transpilePackages: [
    "@atlaskit/avatar",
    "@atlaskit/badge",
    "@atlaskit/avatar-group",
    "@atlaskit/navigation-system",
    "@atlaskit/button",
    "@atlaskit/checkbox",
    "@atlaskit/comment",
    "@atlaskit/dropdown-menu",
    "@atlaskit/drawer",
    "@atlaskit/datetime-picker",
    "@atlaskit/date-label",
    "@atlaskit/dynamic-table",
    "@atlaskit/empty-state",
    "@atlaskit/flag",
    "@atlaskit/inline-edit",
    "@atlaskit/inline-dialog",
    "@atlaskit/form",
    "@atlaskit/popup",
    "@atlaskit/pagination",
    "@atlaskit/primitives",
    "@atlaskit/heading",
    "@atlaskit/select",
    "@atlaskit/calendar",
    "@atlaskit/icon",
    "@atlaskit/lozenge",
    "@atlaskit/modal-dialog",
    "@atlaskit/tokens",
    "@atlaskit/textarea",
    "@atlaskit/textfield",
    "@atlaskit/tooltip",
    "@atlaskit/spinner",
  ],
};

export default nextConfig;
