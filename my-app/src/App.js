import React, { useState, useEffect } from 'react';
import './App.css';
import TelegramFileViewer from './TelegramFileUploader';
const getBlockColor = (type) => {
  switch (type) {
    case "Task":
      return "#FF6347"; // Tomato
    case "Step":
      return "#8A2BE2"; // BlueViolet
    case "Agent":
      return "#32CD32"; // LimeGreen
    case "Team":
      return "#FFD700"; // Gold
    case "Start":
      return "#00BFFF"; // DeepSkyBlue
    default:
      return "#FFFFFF"; // Default color (Blue)
  }
};

function App() {

  const [blocks, setBlocks] = useState([
    { id: 1, x: 100, y: 100, type: "None", name: "", connectedPoints: [], width: 150, height: 50 },
    { id: 2, x: 300, y: 200, type: "None", name: "", connectedPoints: [], width: 150, height: 50 },
  ]);


  
  const handleFieldChange = (blockId, field, value) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId ? { ...block, [field]: value } : block
      )
    );
  };

  const [menuPosition, setMenuPosition] = useState(null);
  const [draggingBlock, setDraggingBlock] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [isCameraMoving, setIsCameraMoving] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [connections, setConnections] = useState([]); // Для хранения соединений

  const handleRightClick = (e) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleDocumentClick = (e) => {
    if (!e.target.closest(".context-menu")) {
      setMenuPosition(null);
    }
  };

  useEffect(() => {
    if (menuPosition) {
      document.addEventListener("mousedown", handleDocumentClick);
    } else {
      document.removeEventListener("mousedown", handleDocumentClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [menuPosition]);

  const createBlock = () => {
    if (!menuPosition) return;
    const newBlock = { id: Date.now(), x: menuPosition.x, y: menuPosition.y, type: "None", name: "", connectedPoints: [], width: 150, height: 50 };
    setBlocks((prevBlocks) => [...prevBlocks, newBlock]);
    setMenuPosition(null);
    console.log(`Создан новый блок:`, newBlock);
  };

  const deleteBlock = (blockId) => {
    setBlocks((prevBlocks) => prevBlocks.filter((block) => block.id !== blockId));
    setConnections((prevConnections) => prevConnections.filter(connection => connection.fromBlockId !== blockId && connection.toBlockId !== blockId));
    console.log(`Удален блок с id: ${blockId}`);
  };

  const handleTypeChange = (blockId, newType) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              type: newType,
              height:
                newType === "Team"
                  ? 80
                  : newType === "Agent"
                  ? 470
                  : newType === "Task"
                  ? 350
                  : newType === "Step"
                  ? 380 // Устанавливаем высоту для типа Step
                  : 30,
            }
          : block
      )
    );
  };

  const handleMouseDown = (e, blockId) => {
    e.stopPropagation();
    setDraggingBlock({ id: blockId, offsetX: e.clientX, offsetY: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (draggingBlock) {
      setBlocks((prevBlocks) =>
        prevBlocks.map((block) =>
          block.id === draggingBlock.id
            ? {
                ...block,
                x: block.x + (e.clientX - draggingBlock.offsetX),
                y: block.y + (e.clientY - draggingBlock.offsetY),
              }
            : block
        )
      );
      setDraggingBlock({
        ...draggingBlock,
        offsetX: e.clientX,
        offsetY: e.clientY,
      });
    }

    if (isCameraMoving) {
      const deltaX = e.clientX - cameraPosition.x;
      const deltaY = e.clientY - cameraPosition.y;

      setCameraPosition({ x: e.clientX, y: e.clientY });

      setBlocks((prevBlocks) =>
        prevBlocks.map((block) => ({
          ...block,
          x: block.x + deltaX,
          y: block.y + deltaY,
        }))
      );
    }

    if (draggingPoint) {
      setDraggingPoint({
        ...draggingPoint,
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingBlock(null);
    setDraggingPoint(null);
    setIsCameraMoving(false);
  };

  const handleMouseDownCamera = (e) => {
    if (e.button === 0) {
      setIsCameraMoving(true);
      setCameraPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointMouseDown = (e, blockId, pointType) => {
    e.stopPropagation();
    setDraggingPoint({ id: blockId, pointType, offsetX: e.clientX, offsetY: e.clientY });
  };

  const handlePointMouseUp = (e, blockId, pointType) => {
    if (draggingPoint) {
      // Проверяем, чтобы точки не были одинакового типа (input-input или output-output)
      if (draggingPoint.pointType === pointType) {
        setDraggingPoint(null); // Завершаем операцию, если типы совпадают
        return;
      }
  
      // Проверяем, существует ли уже соединение между этими точками
      const connectionExists = connections.some(
        (connection) =>
          (connection.fromBlockId === draggingPoint.id && connection.toBlockId === blockId) ||
          (connection.fromBlockId === blockId && connection.toBlockId === draggingPoint.id)
      );
  
      // Если соединения нет, добавляем новое
      if (!connectionExists) {
        setConnections((prevConnections) => [
          ...prevConnections,
          {
            fromBlockId: draggingPoint.id,
            toBlockId: blockId,
            fromPoint: draggingPoint.pointType,
            toPoint: pointType,
          },
        ]);
      }
    }
    setDraggingPoint(null);
  };
  

  const handleConnectionClick = (connection, e) => {
    e.stopPropagation();
    setConnections((prevConnections) =>
      prevConnections.filter(
        (conn) =>
          !(conn.fromBlockId === connection.fromBlockId && conn.toBlockId === connection.toBlockId) &&
          !(conn.fromBlockId === connection.toBlockId && conn.toBlockId === connection.fromBlockId)
      )
    );
  };

  const blocksById = blocks.reduce((acc, block) => {
    acc[block.id] = block;
    return acc;
  }, {});

  const getConnectionCoords = (connection) => {
    const fromBlock = blocksById[connection.fromBlockId];
    const toBlock = blocksById[connection.toBlockId];

    if (!fromBlock || !toBlock) return null;

    const fromX = fromBlock.x + (connection.fromPoint === "input" ? 0 : fromBlock.width);
    const fromY = fromBlock.y + fromBlock.height / 2;
    const toX = toBlock.x + (connection.toPoint === "input" ? 0 : toBlock.width);
    const toY = toBlock.y + toBlock.height / 2;

    return { fromX, fromY, toX, toY };
  };

  return (
    <div
      className="App"
      style={{ height: "100vh", position: "relative", overflow: "hidden", background: "#f4f6f9" }}
      onContextMenu={(e) => handleRightClick(e)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDownCamera}
    >
      {menuPosition && (
        <div className="context-menu" style={{ top: menuPosition.y, left: menuPosition.x }}>
          <button onClick={createBlock}>Добавить блок</button>
        </div>
      )}
      {/* Область для отображения файлов */}
      <div style={{ position: 'absolute', top: 10, right: 10, width: '300px', backgroundColor: '#ffffff', padding: '10px', borderRadius: '5px', zIndex: 10000 }}>
        <h3>Загруженные файлы</h3>
        <TelegramFileViewer />
      </div>

{blocks.map((block) => (
    <div
    key={block.id}
    className="block"
    style={{
      top: block.y,
      left: block.x,
      width: block.width,
      height: block.height,
      backgroundColor: "#e1e8f0",
      border: `2px solid ${getBlockColor(block.type)}`,
      borderRadius: "8px",
    }}
    onMouseDown={(e) => handleMouseDown(e, block.id)}
  >
    <button
      className="delete-icon"
      onClick={() => deleteBlock(block.id)}
    ></button>
    
    <div>
      <label>Type: </label>
      <select
        value={block.type}
        onChange={(e) => handleTypeChange(block.id, e.target.value)}
      >
        <option value="None">None</option>
        <option value="Task">Task</option>
        <option value="Step">Step</option>
        <option value="Agent">Agent</option>
        <option value="Team">Team</option>
        <option value="Start">Start</option>
      </select>
    </div>

    {block.type === "Team" && (
      <div>
        <label>Name: </label>
        <input
          type="text"
          value={block.name || ""}
          onChange={(e) => handleFieldChange(block.id, "name", e.target.value)}
          style={{
            width: "90%",
            height: "20px",
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
      </div>
    )}

    {block.type === "Agent" && (
      <div>
        <label>Name: </label>
        <input
          type="text"
          value={block.name || ""}
          onChange={(e) => handleFieldChange(block.id, "name", e.target.value)}
          style={{
            width: "90%",
            height: "30px",
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
        <label>Role: </label>
        <textarea
          value={block.role || ""}
          onChange={(e) => handleFieldChange(block.id, "role", e.target.value)}
          style={{
            width: "90%",
            height: "75px", // Уменьшаем высоту текстового поля
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
        <label>Goal: </label>
        <textarea
          value={block.goal || ""}
          onChange={(e) => handleFieldChange(block.id, "goal", e.target.value)}
          style={{
            width: "90%",
            height: "75px",
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
        <label>Backstory: </label>
        <textarea
          value={block.backstory || ""}
          onChange={(e) =>
            handleFieldChange(block.id, "backstory", e.target.value)
          }
          style={{
            width: "90%",
            height: "75px", // Уменьшаем высоту текстового поля
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
      </div>
    )}

    {block.type === "Task" && (
      <div>
        <label>Agent: </label>
        <input
          type="text"
          value={block.agent || ""}
          onChange={(e) => handleFieldChange(block.id, "agent", e.target.value)}
          style={{
            width: "90%",
            height: "40px",
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
        <label>Description: </label>
        <textarea
          value={block.description || ""}
          onChange={(e) =>
            handleFieldChange(block.id, "description", e.target.value)
          }
          style={{
            width: "90%",
            height: "75px", // Уменьшаем высоту текстового поля
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
        <label>Expected Output: </label>
        <textarea
          value={block.expected_output || ""}
          onChange={(e) =>
            handleFieldChange(block.id, "expected_output", e.target.value)
          }
          style={{
            width: "90%",
            height: "75px", // Уменьшаем высоту текстового поля
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
      </div>
    )}

    {block.type === "Step" && (
      <div>
        <label>Tool: </label>
        <textarea
          value={block.tool || ""}
          onChange={(e) => handleFieldChange(block.id, "tool", e.target.value)}
          style={{
            width: "90%",
            height: "75px", // Увеличиваем высоту текстового поля
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
        <label>Arg: </label>
        <textarea
          value={block.arg || ""}
          onChange={(e) => handleFieldChange(block.id, "arg", e.target.value)}
          style={{
            width: "90%",
            height: "75px", // Увеличиваем высоту текстового поля
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
        <label>Output_var: </label>
        <textarea
          value={block.output_var || ""}
          onChange={(e) =>
            handleFieldChange(block.id, "output_var", e.target.value)
          }
          style={{
            width: "90%",
            height: "75px", // Увеличиваем высоту текстового поля
            fontSize: "16px",
            padding: "8px",
            margin: "5px 0",
          }}
        />
      </div>
    )}

    <div
      className="point input"
      style={{
        position: "absolute",
        top: block.height / 2 - 5,
        left: -10,
        width: 10,
        height: 10,
        backgroundColor: "green",
        borderRadius: "50%",
      }}
      onMouseDown={(e) => handlePointMouseDown(e, block.id, "input")}
      onMouseUp={(e) => handlePointMouseUp(e, block.id, "input")}
    />
    <div
      className="point output"
      style={{
        position: "absolute",
        top: block.height / 2 - 5,
        right: -10,
        width: 10,
        height: 10,
        backgroundColor: "red",
        borderRadius: "50%",
      }}
      onMouseDown={(e) => handlePointMouseDown(e, block.id, "output")}
      onMouseUp={(e) => handlePointMouseUp(e, block.id, "output")}
    />
  </div>
))}

<svg
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "90%",
    height: "100%",
    pointerEvents: "none",
  }}
>
  {/* Пунктирная линия для предварительного соединения */}
  {draggingPoint && draggingPoint.x && draggingPoint.y && (
    <path
      d={`M${draggingPoint.x},${draggingPoint.y} L${draggingPoint.x - (draggingPoint.x - draggingPoint.offsetX)},${draggingPoint.y - (draggingPoint.y - draggingPoint.offsetY)}`}
      stroke="#000"
      strokeWidth="2"
      strokeDasharray="5,5" // Пунктирная линия
      fill="transparent"
      pointerEvents="none"
    />
  )}

  {connections.map((connection, index) => {
    const coords = getConnectionCoords(connection);
    if (!coords) return null;

    // Используем только координаты для отрисовки кривой
    const pathData = `
      M${coords.fromX},${coords.fromY} 
      C${coords.fromX + 100},${coords.fromY} 
        ${coords.toX - 100},${coords.toY} 
        ${coords.toX},${coords.toY}
    `;

    return (
      <path
        key={index}
        d={pathData}
        stroke="#000"
        strokeWidth="2"
        fill="transparent"
        pointerEvents="none"
      />
    );
  })}
</svg>


    </div>
  );
}

export default App;
