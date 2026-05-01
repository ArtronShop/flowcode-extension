import type { BlockCategory } from "$lib/blocks/types";

export type ExtensionProps = {
    id: string;
    name: string;
    author: string;
    description: string;
    version: string;
    depends?: string[];  // list of Arduino Library (name@version eg. ArduinoGraphics@1.1.0)
    requires?: string[]; // list of extension IDs that must be installed together
    src: BlockCategory | string;
};
