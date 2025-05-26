import { X } from "lucide-react";
import { useState } from "react";

interface CommandModalProps {
  groupName: string;
  onClose: () => void;
  onSubmit: (name: string, command: string, isDetached: boolean) => void;
}

const CommandModal: React.FC<CommandModalProps> = ({
  groupName,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [isDetached, setIsDetached] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && command.trim()) {
      onSubmit(name.trim(), command.trim(), isDetached);
      setName("");
      setCommand("");
      setIsDetached(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Command to "{groupName}"</h2>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="commandName">Command Name</label>
            <input
              id="commandName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter command name"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="commandText">Command</label>
            <textarea
              id="commandText"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command to execute (e.g., ls -la, npm install, firefox, etc.)"
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isDetached}
                onChange={(e) => setIsDetached(e.target.checked)}
              />
              <span>Run in background (detached mode)</span>
            </label>
            <small className="help-text">
              Use this for GUI applications (firefox, code, etc.) or
              long-running processes
            </small>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Command
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommandModal;
