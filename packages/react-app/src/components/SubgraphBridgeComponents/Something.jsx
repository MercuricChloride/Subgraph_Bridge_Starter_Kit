import { useFieldArray, useForm } from "react-hook-form";
import { useRecoilState, useRecoilValue } from "recoil";
import { Button } from "antd";
import * as store from "../../store";

const orderDirections = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

const operators = [
  {
    value: "",
    label: "Equal To",
  },
  {
    value: "_gt",
    label: "Greater Than",
  },
  {
    value: "_gte",
    label: "Greater Than or Equal To",
  },
  {
    value: "_lt",
    label: "Less Than",
  },
  {
    value: "_lte",
    label: "Less Than or Equal To",
  },
  {
    value: "_in",
    label: "Inside",
  },
  {
    value: "_contains",
    label: "Contains",
  },
  {
    value: "_not",
    label: "Not",
  },
];

const counts = [1, 5, 10, 25, 50, 100];
const defaultCount = 10;

export function FilterEntityForm({ entityName }) {
  const apiKey = "5322ad8fdc895630effd0f84c7a668ea";
  const subgraphId = `https://gateway.testnet.thegraph.com/api/${apiKey}/subgraphs/id/3QvgMfSRE8Pop3aMoD4D9HifMFSFKYYFNPu43GhMVAhE`;
  const entitySchema = useRecoilValue(store.entitySchema({ subgraphId, entityName }));
  const columns = entitySchema.fields;

  const [entityFilter, setEntityFilter] = useRecoilState(store.entityFilterFamily({ subgraphId, entityName }));

  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: {
      count: defaultCount,
      orderBy: "",
      orderDirection: "",
      where: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "where",
  });

  const onSubmit = data => {
    setEntityFilter(entityFilter => ({
      ...entityFilter,
      form: {
        count: data.count,
        orderBy: data.orderBy,
        orderDirection: data.orderDirection,
        where: data.where,
      },
    }));
  };
  const watchWhere = watch("where");

  const controlledFields = fields.map((field, index) => {
    return {
      ...field,
      ...watchWhere[index],
    };
  });
  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-3 pr-4 rounded-t-lg mb-2 sticky z-10 group top-0 text-sm leading-6 font-semibold p-0 bg-slate-900 text-slate-300 ">
          <div>Sort By</div>
          <div>Direction</div>
          <div>First</div>
        </div>

        <div className="px-3 grid grid-cols-3 w-full gap-3 mt-3 items-start justify-start">
          <select {...register(`orderBy`)} className="w-full">
            <option value="" disabled selected>
              Select Field
            </option>

            {columns.map(column => (
              <option value={column.name}>{column.name}</option>
            ))}
          </select>

          <select {...register(`orderDirection`)} className="w-full">
            <option value="" disabled selected>
              Select Direction
            </option>

            {orderDirections.map(dir => (
              <option value={dir.value}>{dir.label}</option>
            ))}
          </select>

          <select {...register(`count`)} className="w-full">
            {counts.map(count => (
              <option value={count}>{count}</option>
            ))}
          </select>
        </div>

        {controlledFields.length > 0 && (
          <div className="grid grid-cols-3 mt-3 pr-4 mb-2 sticky z-10 group top-0 text-sm leading-6 font-semibold p-0 bg-slate-900 text-slate-300 ">
            <div>Field</div>
            <div>Operator</div>
            <div>Value</div>
          </div>
        )}
        <div className="px-3">
          {controlledFields.map((field, index) => {
            return (
              <div
                onSubmit={e => {
                  handleSubmit(onSubmit)(e);
                }}
                className=" grid grid-cols-3 w-full gap-3 mt-3 items-start justify-start"
              >
                <select required {...register(`where.${index}.column`)} className="w-full">
                  <option value="" disabled selected>
                    Select Field
                  </option>

                  {columns.map(column => (
                    <option value={column.name}>{column.name}</option>
                  ))}
                </select>

                <select required {...register(`where.${index}.operator`)} className="w-full">
                  <option value="" disabled selected>
                    Select Operator
                  </option>

                  {operators.map(operator => (
                    <option value={operator.value}>{operator.label}</option>
                  ))}
                </select>

                <div className="flex w-full items-center justify-evenly">
                  <input required {...register(`where.${index}.comparison`)} className="flex-1 w-full" />
                  <div className="pl-2 cursor-pointer opacity-50 hover:opacity-100 transition">
                    <X className="w-8 h-8 text-rose-500 mx-auto" onClick={() => remove(index)} />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex gap-4 py-3">
            <Button size="sm" onClick={() => append({})}>
              Add Filter
            </Button>
            <Button size="sm" type="submit">
              Query
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
