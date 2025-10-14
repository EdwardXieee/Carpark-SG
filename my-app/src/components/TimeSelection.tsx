import { Stack } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

interface TimeSelectionProps {
  startTime: Date;
  endTime: Date;
  onStartTimeChange: (date: Date) => void;
  onEndTimeChange: (date: Date) => void;
}

export function TimeSelection({ startTime, endTime, onStartTimeChange, onEndTimeChange }: TimeSelectionProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Stack direction="row" spacing={0.5} sx={{ backgroundColor: 'white', borderRadius: 1, p: 0.5 }}>
        <DateTimePicker
          label="Start Time"
          value={dayjs(startTime)}
          onChange={(newValue) => newValue && onStartTimeChange(newValue.toDate())}
          timeSteps={{ minutes: 30 }}
          slotProps={{
            textField: {
              size: 'small',
              onKeyDown: (e) => e.preventDefault(),
            },
          }}
        />
        <DateTimePicker
          label="End Time"
          value={dayjs(endTime)}
          onChange={(newValue) => newValue && onEndTimeChange(newValue.toDate())}
          timeSteps={{ minutes: 30 }}
          slotProps={{
            textField: {
              size: 'small',
              onKeyDown: (e) => e.preventDefault(),
            },
          }}
        />
      </Stack>
    </LocalizationProvider>
  );
}
