import { useEffect, useState } from 'react';
import { Range, getTrackBackground } from 'react-range';

interface MinMaxRangeProps {
  label?: string;
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  step?: number;
}

const MinMaxRange = (props: MinMaxRangeProps) => {
  let { min, max } = props;
  const { minValue, maxValue, onMinChange, onMaxChange, label, step = 5000 } = props;

  min = Math.floor(min);
  max = Math.ceil(max);

  // Ensure values are multiples of step and within min and max range
  const initialMinValue = Math.max(min, Math.floor(minValue / step) * step);
  const initialMaxValue = Math.min(max, Math.ceil(maxValue / step) * step);

  const [values, setValues] = useState<number[]>([initialMinValue, initialMaxValue]);

  useEffect(() => {
    const adjustedMinValue = Math.max(min, Math.floor(minValue / step) * step);
    const adjustedMaxValue = Math.min(max, Math.ceil(maxValue / step) * step);
    setValues([adjustedMinValue, adjustedMaxValue]);
  }, [minValue, maxValue, min, max, step]);

  const onChange = (values: number[]) => {
    const adjustedValues = values.map(value => {
      const adjustedValue = Math.round(value / step) * step;
      return Math.max(min, Math.min(max, adjustedValue));
    });
    setValues(adjustedValues);
    onMinChange(adjustedValues[0]);
    onMaxChange(adjustedValues[1]);
  };

  if (!Array.isArray(values) || values.some(value => typeof value !== 'number')) {
    return null;
  }

  return (
    <div className='flex flex-col justify-start gap-3'>
      <span className="text-white text-sm">{label}</span>
      <div className="flex justify-center flex-wrap">
        <Range
          values={values}
          step={step}
          min={min}
          max={max}
          onChange={onChange}
          renderTrack={({ props, children }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              className="h-9 flex w-full"
              style={props.style}
            >
              <div
                ref={props.ref}
                className="h-[5px] w-full self-center rounded-lg"
                style={{
                  background: getTrackBackground({
                    values: values,
                    colors: ['#202125', 'rgba(248, 206, 70, .30)', '#202125'],
                    min: min,
                    max: max
                  })
                }}
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ index, props, isDragged }) => (
            <div
              {...props}
              className="relative h-4 w-4 rounded-lg bg-tinkerYellow flex flex-row items-center justify-center shadow-md"
              style={props.style}
            >
              <div className="absolute bottom-4 text-tinkerTextGrey text-xxs px-3 rounded-lg">
                {values[index]}
              </div>
              <div className={`h-2 w-2 p-1 rounded-lg ${ isDragged ? 'bg-white' : 'bg-tinkerGrey' }`} />
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default MinMaxRange;