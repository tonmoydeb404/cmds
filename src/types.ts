export interface CommandItem {
  id: string;
  name: string;
  command: string;
  isDetached?: boolean;
}

export interface CommandGroup {
  id: string;
  name: string;
  commands: CommandItem[];
}

export interface ExecutionResult {
  name: string;
  output: string;
}
