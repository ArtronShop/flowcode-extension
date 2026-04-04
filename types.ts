import type { BlockCategory } from "$lib/blocks/types";

export type ExtensionProps = {
    id: string;
    name: string;
    author: string;
    description: string;
    version: string;
    depends?: string[]; // list of Arduino Library (name@version eg. ArduinoGraphics@1.1.0)
    src: BlockCategory | string;
};
