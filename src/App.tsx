import { confirm } from "@tauri-apps/plugin-dialog";
import { Edit, Play, PlayCircle, Plus, Trash2 } from "lucide-react";
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
  // const [editingGroup, setEditingGroup] = useState<CommandGroup | null>(null);
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
    }
  };

  const handleExecuteGroup = async (group: CommandGroup) => {
    if (group.commands.length === 0) {
      alert("No commands to execute in this group");
      return;
    }

    try {
      setIsLoading(true);
      const results = await TauriAPI.executeGroupCommands(group.id);
      setExecutionResults(results);
      setIsExecutionModalOpen(true);
    } catch (error) {
      console.error("Failed to execute group commands:", error);
      alert("Failed to execute group commands");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCommand = async (name: string, command: string) => {
    if (!selectedGroup) return;

    try {
      await TauriAPI.addCommandToGroup(selectedGroup.id, name, command);
      await loadGroups();
      setIsCommandModalOpen(false);
    } catch (error) {
      console.error("Failed to add command:", error);
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
    }
  };

  const handleExecuteCommand = async (command: CommandItem) => {
    try {
      setIsLoading(true);
      const result = await TauriAPI.executeCommand(command.command);
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

  return (
    <div className="app">
      <header className="header">
        <h1>Command Group Manager</h1>
        <button
          className="btn btn-primary"
          onClick={() => setIsGroupModalOpen(true)}
        >
          <Plus size={16} />
          Create Group
        </button>
      </header>

      <main className="main">
        {groups.length === 0 ? (
          <div className="empty-state">
            <p>
              No command groups yet. Create your first group to get started!
            </p>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => (
              <div key={group.id} className="group-card">
                <div className="group-header">
                  <h3>{group.name}</h3>
                  <div className="group-actions">
                    <button
                      className="btn btn-icon"
                      onClick={() => {
                        setSelectedGroup(group);
                        setIsCommandModalOpen(true);
                      }}
                      title="Add Command"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn btn-icon btn-success"
                      onClick={() => handleExecuteGroup(group)}
                      disabled={isLoading || group.commands.length === 0}
                      title="Execute All Commands"
                    >
                      <PlayCircle size={16} />
                    </button>
                    <button
                      className="btn btn-icon btn-danger"
                      onClick={() => handleDeleteGroup(group)}
                      title="Delete Group"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="commands-list">
                  {group.commands.length === 0 ? (
                    <p className="no-commands">No commands yet</p>
                  ) : (
                    group.commands.map((command) => (
                      <div key={command.id} className="command-item">
                        <div className="command-info">
                          <h4>{command.name}</h4>
                          <code>{command.command}</code>
                        </div>
                        <div className="command-actions">
                          <button
                            className="btn btn-icon btn-success"
                            onClick={() => handleExecuteCommand(command)}
                            disabled={isLoading}
                            title="Execute Command"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            className="btn btn-icon btn-danger"
                            onClick={() =>
                              handleDeleteCommand(group.id, command.id)
                            }
                            title="Delete Command"
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

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Executing...</div>
        </div>
      )}
    </div>
  );
}

export default App;
