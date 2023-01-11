import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { Text } from "@visx/text";

const SIZE = 56;
const HALF = SIZE / 2;
const FONT_SIZE = 12;

const PieChart = ({
  data,
  text,
}: {
  data: { amount: number; color: string }[];
  text: string;
}) => {
  return (
    <main>
      <svg width={SIZE} height={SIZE}>
        <Group top={HALF} left={HALF}>
          <Pie
            data={data}
            pieValue={(data) => data.amount}
            outerRadius={HALF}
            innerRadius={HALF / 1.5}
            padAngle={0.01}
            pieSortValues={null}
          >
            {(pie) => {
              return pie.arcs.map((arc) => {
                const d = pie.path(arc);

                if (!d) return;

                return (
                  <g key={arc.data.color}>
                    <path d={d} fill={arc.data.color}></path>
                  </g>
                );
              });
            }}
          </Pie>

          <>
            <Text textAnchor="middle" fill="#fff" fontSize={FONT_SIZE} dy={4}>
              {text}
            </Text>
          </>
        </Group>
      </svg>
    </main>
  );
};

export default PieChart;
