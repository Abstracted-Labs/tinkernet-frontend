import { useContext } from "react";

import { ApiContext } from "../providers/api";

const useApi = () => {
  const api = useContext(ApiContext);

  if (!api) {
    throw new Error("No API found");
  }

  return api;
};

export default useApi;
