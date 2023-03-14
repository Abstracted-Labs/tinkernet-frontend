import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { ISubmittableResult } from "@polkadot/types/types";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { shallow } from "zustand/shallow";

import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import useModal from "../stores/modals";

const schema = z
  .object({
    name: z.string().max(20),
    description: z.string().max(300),
    image: z.string().url().max(100),
  })
  .required();

const RegisterProject = ({ isOpen }: { isOpen: boolean }) => {
  const { setOpenModal } = useModal(
    (state) => ({
      setOpenModal: state.setOpenModal,
    }),
    shallow
  );
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const registerProjectForm = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const api = useApi();

  const getSignAndSendCallback = (id: string) => {
    let hasFinished = false;

    return ({ status }: ISubmittableResult) => {
      if (hasFinished) {
        return;
      }

      if (status.isInvalid) {
        toast.dismiss();

        toast.error("Transaction is invalid");

        hasFinished = true;
      } else if (status.isReady) {
        toast.loading("Submitting transaction...");
      } else if (status.isDropped) {
        toast.dismiss(id);

        toast.error("Transaction dropped");

        hasFinished = true;
      } else if (status.isInBlock || status.isFinalized) {
        toast.dismiss(id);

        toast.success("Transaction submitted!");

        hasFinished = true;
      }
    };
  };

  const handleRegister = registerProjectForm.handleSubmit(
    async ({ name, description, image }) => {
      if (!selectedAccount) return;

      if (!api) return;

      if (!name) {
        toast.error("Name is required");

        return;
      }

      if (!description) {
        toast.error("Description is required");

        return;
      }

      if (!image) {
        toast.error("Image URL is required");

        return;
      }

      const id = toast.loading("Registering...");

      await web3Enable("Tinkernet");

      const injector = await web3FromAddress(selectedAccount.address);

      const CORE_ID = 0;

      await api.tx.ocifStaking
        .registerCore(CORE_ID, {
          name,
          description,
          image,
        })
        .signAndSend(
          selectedAccount.address,
          { signer: injector.signer },
          getSignAndSendCallback(id)
        );

      setOpenModal({ name: null });
    }
  );

  useEffect(() => {
    registerProjectForm.reset();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={() => setOpenModal({ name: null })}>
      <>
        <Dialog.Overlay className="fixed inset-0 z-40 h-screen w-full bg-neutral-900/40 backdrop-blur-md" />

        <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
          <XMarkIcon className="h-5 w-5" />
          <span className="block">close</span>
        </button>
        <Dialog.Panel>
          <div className="fixed left-1/2 top-1/2 z-50 mx-auto block max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-auto rounded-md border border-gray-50 bg-neutral-900 p-6 sm:w-full">
            <h2 className="text-xl font-bold text-white">Register Project</h2>

            <div className="mt-4 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-4">
                <form className="flex flex-col gap-4" onSubmit={handleRegister}>
                  <>
                    <div className="relative rounded-md  border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                      <label
                        htmlFor="name"
                        className="block text-xs font-medium text-white"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        {...registerProjectForm.register("name", {
                          required: true,
                        })}
                        className="block w-full border-0 bg-transparent p-0 text-white focus:ring-transparent sm:text-sm"
                      />
                      {registerProjectForm.formState.errors.name ? (
                        <div className="text-red-400">
                          {registerProjectForm.formState.errors.name.message}
                        </div>
                      ) : null}
                    </div>

                    <div className="relative rounded-md  border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                      <label
                        htmlFor="image"
                        className="block text-xs font-medium text-white"
                      >
                        Image URL
                      </label>
                      <input
                        type="text"
                        {...registerProjectForm.register("image", {
                          required: true,
                        })}
                        className="block w-full border-0 bg-transparent p-0 text-white focus:ring-transparent sm:text-sm"
                      />
                      {registerProjectForm.formState.errors.image ? (
                        <div className="text-red-400">
                          {registerProjectForm.formState.errors.image.message}
                        </div>
                      ) : null}
                    </div>

                    <div className="relative rounded-md  border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                      <label
                        htmlFor="description"
                        className="block text-xs font-medium text-white"
                      >
                        Description
                      </label>
                      <textarea
                        {...registerProjectForm.register("description", {
                          required: true,
                        })}
                        className="block w-full border-0 bg-transparent p-0 text-white focus:ring-transparent sm:text-sm"
                      />
                      {registerProjectForm.formState.errors.description ? (
                        <div className="text-red-400">
                          {
                            registerProjectForm.formState.errors.description
                              .message
                          }
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="submit"
                      disabled={
                        !registerProjectForm.formState.isValid &&
                        !registerProjectForm.formState.isDirty
                      }
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-amber-400 py-2 px-4 text-sm font-bold text-neutral-900 shadow-sm transition-colors hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400"
                    >
                      Register
                    </button>
                  </>
                </form>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </>
    </Dialog>
  );
};

export default RegisterProject;
