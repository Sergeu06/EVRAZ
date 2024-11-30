import React, { useState, useEffect } from "react";

const TelegramFileViewer = () => {
  const [chatId, setChatId] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchFilesFromServer = async (chatId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/get_files/${chatId}`);
      
      if (!response.ok) {
        throw new Error(`Ошибка: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.files) {
        setFiles(data.files);
      } else {
        setError(data.error || "Не удалось получить файлы.");
      }
    } catch (err) {
      setError(`Ошибка при получении файлов: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const startParam = queryParams.get("start");

    if (startParam) {
      setChatId(startParam);
      fetchFilesFromServer(startParam);
    } else {
      setError("Telegram ID не найден в URL.");
    }
  }, []);

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div style={{ padding: "20px", zIndex: 10000 }}>
      {loading && <p>Загрузка...</p>}
      {files.length > 0 ? (
        <ul>
          {files.map((file, index) => (
            <li key={index}>
              {file.file_name}{" "}
              <a href={`http://localhost:5000/get_file_link/${file.file_id}`} target="_blank" rel="noopener noreferrer">
                Скачать
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>Файлы отсутствуют.</p>
      )}
    </div>
  );
};

export default TelegramFileViewer;
