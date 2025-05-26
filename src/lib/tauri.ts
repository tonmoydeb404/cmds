import { invoke } from "@tauri-apps/api/core";
import { CommandGroup } from "../types";

export class TauriAPI {
  static async createGroup(name: string): Promise<string> {
    return await invoke("create_group", { name });
  }

  static async getGroups(): Promise<CommandGroup[]> {
    return await invoke("get_groups");
  }

  static async deleteGroup(groupId: string): Promise<void> {
    return await invoke("delete_group", { groupId });
  }

  static async addCommandToGroup(
    groupId: string,
    name: string,
    command: string
  ): Promise<string> {
    return await invoke("add_command_to_group", { groupId, name, command });
  }

  static async deleteCommandFromGroup(
    groupId: string,
    commandId: string
  ): Promise<void> {
    return await invoke("delete_command_from_group", { groupId, commandId });
  }

  static async executeCommand(command: string): Promise<string> {
    return await invoke("execute_command", { command });
  }

  static async executeCommandDetached(command: string): Promise<string> {
    return await invoke("execute_command_detached", { command });
  }

  static async executeGroupCommands(
    groupId: string
  ): Promise<[string, string][]> {
    return await invoke("execute_group_commands", { groupId });
  }
}
