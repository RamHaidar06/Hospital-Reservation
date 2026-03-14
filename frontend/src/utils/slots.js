export function generateTimeSlots(doctor) {
  const slots = [];
  const workingDays = (doctor.workingDays || "").split(",").filter(Boolean);
  const startTime = doctor.startTime || "09:00";
  const endTime = doctor.endTime || "17:00";

  const [startHour] = startTime.split(":").map(Number);
  const [endHour] = endTime.split(":").map(Number);

  const dayValues = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  for (let d = 0; d < 30; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const dayName = dayValues[date.getDay()];
    if (!workingDays.includes(dayName)) continue;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        slots.push({
          date: date.toISOString().split("T")[0],
          time: timeStr,
        });
      }
    }
  }

  return slots;
}