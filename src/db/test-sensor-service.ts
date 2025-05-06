import { saveSensorData, saveMultipleSensorData, getLatestSensorData } from "./sensor-service";

const testSensorService = async () => {
  try {
    // Тест сохранения одной записи
    const singleData = {
      sensor_id: "test_sensor_1",
      temperature: 25.5,
      humidity: 45.2,
    };

    const savedRecord = await saveSensorData(singleData);
    console.log("Сохранена одна запись:", savedRecord);

    // Тест сохранения массива записей
    const multipleData = [
      {
        sensor_id: "test_sensor_2",
        temperature: 26.1,
        humidity: 46.3,
      },
      {
        sensor_id: "test_sensor_2",
        temperature: 26.2,
        humidity: 46.5,
      },
    ];

    const savedCount = await saveMultipleSensorData(multipleData);
    console.log(`Сохранено ${savedCount} записей`);

    // Тест получения последних данных
    const latestData = await getLatestSensorData("test_sensor_2", 5);
    console.log("Последние данные сенсора:", latestData);

  } catch (error) {
    console.error("Ошибка при тестировании сервиса:", error);
  }
};

testSensorService(); 