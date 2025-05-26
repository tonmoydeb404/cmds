import { confirm, message } from "@tauri-apps/plugin-dialog";
import { Download, Play, PlayCircle, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import "./App.css";
import CommandModal from "./components/CommandModal";
import ExecutionModal from "./components/ExecutionModal";
import GroupModal from "./components/GroupModal";
import { TauriAPI } from "./lib/tauri";
import { CommandGroup, CommandItem } from "./types";

function App() {
  const [groups, setGroups] = useState<CommandGroup[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CommandGroup | null>(null);
  const [executionResults, setExecutionResults] = useState<[string, string][]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const groupData = await TauriAPI.getGroups();
      setGroups(groupData);
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  };

  const handleCreateGroup = async (name: string) => {
    try {
      await TauriAPI.createGroup(name);
      await loadGroups();
      setIsGroupModalOpen(false);
    } catch (error) {
      console.error("Failed to create group:", error);
      await message("Failed to create group", "Error");
    }
  };

  const handleDeleteGroup = async (group: CommandGroup) => {
    try {
      const confirmed = await confirm(
        `Are you sure you want to delete "${group.name}" and all its commands?`,
        "Delete Group"
      );

      if (confirmed) {
        await TauriAPI.deleteGroup(group.id);
        await loadGroups();
      }
    } catch (error) {
      console.error("Failed to delete group:", error);
      await message("Failed to delete group", "Error");
    }
  };

  const handleExecuteGroup = async (group: CommandGroup) => {
    if (group.commands.length === 0) {
      await message("No commands to execute in this group", "No Commands");
      return;
    }

    try {
      setIsLoading(true);
      const results = await TauriAPI.executeGroupCommands(group.id);
      setExecutionResults(results);
      setIsExecutionModalOpen(true);
    } catch (error) {
      console.error("Failed to execute group commands:", error);
      await message("Failed to execute group commands", "Execution Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCommand = async (
    name: string,
    command: string,
    isDetached: boolean = false
  ) => {
    if (!selectedGroup) return;

    try {
      await TauriAPI.addCommandToGroup(
        selectedGroup.id,
        name,
        command,
        isDetached
      );
      await loadGroups();
      setIsCommandModalOpen(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error("Failed to add command:", error);
      await message("Failed to add command", "Error");
    }
  };

  const handleDeleteCommand = async (groupId: string, commandId: string) => {
    try {
      const confirmed = await confirm(
        "Are you sure you want to delete this command?",
        "Delete Command"
      );

      if (confirmed) {
        await TauriAPI.deleteCommandFromGroup(groupId, commandId);
        await loadGroups();
      }
    } catch (error) {
      console.error("Failed to delete command:", error);
      await message("Failed to delete command", "Error");
    }
  };

  const handleExecuteCommand = async (command: CommandItem) => {
    try {
      setIsLoading(true);
      const result = command.isDetached
        ? await TauriAPI.executeCommandDetached(command.command)
        : await TauriAPI.executeCommand(command.command);
      setExecutionResults([[command.name, result]]);
      setIsExecutionModalOpen(true);
    } catch (error) {
      console.error("Failed to execute command:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setExecutionResults([[command.name, `Error: ${errorMessage}`]]);
      setIsExecutionModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const result = await TauriAPI.exportData();
      await message(result, { title: "Export Successful", kind: "info" });
    } catch (error) {
      console.error("Failed to export data:", error);
      await message("Failed to export data", "Export Error");
    }
  };

  const handleImportData = async () => {
    try {
      // Create a hidden file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          try {
            const result = await TauriAPI.importData(text);
            await message(result, "Import Successful");
            await loadGroups();
          } catch (error) {
            console.error("Failed to import data:", error);
            await message(
              "Failed to import data. Please check the file format.",
              "Import Error"
            );
          }
        }
      };
      input.click();
    } catch (error) {
      console.error("Failed to import data:", error);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Command Group Manager</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleImportData}
            title="Import command groups from JSON file"
          >
            <Upload size={16} />
            Import
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExportData}
            title="Export command groups to JSON file"
          >
            <Download size={16} />
            Export
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsGroupModalOpen(true)}
            title="Create a new command group"
          >
            <Plus size={16} />
            Create Group
          </button>
        </div>
      </header>

      <main className="main">
        {groups.length === 0 ? (
          <div className="empty-state">
            <p>
              No command groups yet. Create your first group to get started!
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setIsGroupModalOpen(true)}
            >
              <Plus size={16} />
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => (
              <div key={group.id} className="group-card">
                <div className="group-header">
                  <h3>{group.name}</h3>
                  <div className="group-actions">
                    <button
                      className="btn btn-icon btn-secondary"
                      onClick={() => {
                        setSelectedGroup(group);
                        setIsCommandModalOpen(true);
                      }}
                      title="Add new command to this group"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      className="btn btn-icon btn-success"
                      onClick={() => handleExecuteGroup(group)}
                      disabled={isLoading || group.commands.length === 0}
                      title="Execute all commands in this group"
                    >
                      <PlayCircle size={16} />
                    </button>
                    <button
                      className="btn btn-icon btn-danger"
                      onClick={() => handleDeleteGroup(group)}
                      title="Delete this group and all its commands"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="commands-list">
                  {group.commands.length === 0 ? (
                    <div className="no-commands">
                      <p style={{ marginBottom: 10 }}>No commands yet</p>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedGroup(group);
                          setIsCommandModalOpen(true);
                        }}
                      >
                        <Plus size={14} />
                        Add First Command
                      </button>
                    </div>
                  ) : (
                    group.commands.map((command) => (
                      <div key={command.id} className="command-item">
                        <div className="command-info">
                          <h4>
                            {command.name}
                            {command.isDetached && (
                              <span className="detached-badge">Background</span>
                            )}
                          </h4>
                          <code>{command.command}</code>
                        </div>
                        <div className="command-actions">
                          <button
                            className="btn btn-icon btn-success"
                            onClick={() => handleExecuteCommand(command)}
                            disabled={isLoading}
                            title="Execute this command"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            className="btn btn-icon btn-danger"
                            onClick={() =>
                              handleDeleteCommand(group.id, command.id)
                            }
                            title="Delete this command"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {isGroupModalOpen && (
        <GroupModal
          onClose={() => setIsGroupModalOpen(false)}
          onSubmit={handleCreateGroup}
        />
      )}

      {isCommandModalOpen && selectedGroup && (
        <CommandModal
          groupName={selectedGroup.name}
          onClose={() => {
            setIsCommandModalOpen(false);
            setSelectedGroup(null);
          }}
          onSubmit={handleAddCommand}
        />
      )}

      {isExecutionModalOpen && (
        <ExecutionModal
          results={executionResults}
          onClose={() => setIsExecutionModalOpen(false)}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Executing commands...</div>
        </div>
      )}
    </div>
  );
}

export default App;
