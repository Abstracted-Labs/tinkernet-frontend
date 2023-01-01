import { useContext } from "react";

import { ApiContext } from "../providers/api";

const useApi = () => {
  const api = useContext(ApiContext);

  if (!api) {
    throw new Error("API_NOT_FOUND");
  }

  return api;
};

export default useApi;
