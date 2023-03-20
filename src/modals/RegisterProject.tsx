import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { ISubmittableResult } from "@polkadot/types/types";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { shallow } from "zustand/shallow";

import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import useModal from "../stores/modals";

const schema = z
  .object({
    core: z.string(),
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
  const [previewState, setPreviewState] = useState({
    name: "",
    description: "",
    image: "",
  });

  const api = useApi();

  const getSignAndSendCallback = () => {
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
        toast.dismiss();

        toast.loading("Submitting registration...");
      } else if (status.isDropped) {
        toast.dismiss();

        toast.error("Registration dropped");

        hasFinished = true;
      } else if (status.isInBlock || status.isFinalized) {
        toast.dismiss();

        toast.success("Registration submitted!");

        hasFinished = true;

        window.location.reload();
      }
    };
  };

  const handleRegister = registerProjectForm.handleSubmit(
    async ({ core, name, description, image }) => {
      if (!selectedAccount) return;

      if (!api) return;

      if (!core) {
        toast.error("Core ID is required");

        return;
      }

      if (!Number.isInteger(Number(core))) {
        toast.error("Core ID should be an integer");

        return;
      }

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

      toast.loading("Registering...");

      await web3Enable("Tinkernet");

      const injector = await web3FromAddress(selectedAccount.address);

      const calls = [api.tx.ocifStaking.registerCore(name, description, image)];

      try {
        await api.tx.inv4
          .operateMultisig(core, "", api.tx.utility.batchAll(calls))
          .signAndSend(
            selectedAccount.address,
            { signer: injector.signer },
            getSignAndSendCallback()
          );

        setOpenModal({ name: null });
      } catch (e) {
        toast.dismiss();

        toast.error("Failed to register project");
      }
    }
  );

  useEffect(() => {
    const subscription = registerProjectForm.watch((values) => {
      setPreviewState((oldValues) => ({
        ...oldValues,
        ...values,
      }));
    });

    return () => subscription.unsubscribe();
  }, [registerProjectForm.watch]);

  useEffect(() => {
    registerProjectForm.reset();

    setPreviewState({
      name: "",
      description: "",
      image: "",
    });
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={() => setOpenModal({ name: null })}>
      <>
        <Dialog.Overlay className="fixed inset-0 z-40 h-screen w-full bg-neutral-900/40 backdrop-blur-md" />

        <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
          <XMarkIcon className="h-5 w-5" />
          <span className="block">close</span>
        </button>
        <Dialog.Panel className="flex flex-row gap-8">
          <div className="fixed left-1/2 top-1/2 z-50 mx-auto flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col gap-8 p-6 sm:w-full">
            <div className="relative flex flex-col gap-4 overflow-hidden rounded-md border border-gray-50 bg-neutral-900 p-6 sm:flex-row">
              <div className="flex w-full flex-col gap-4">
                <div className="flex flex-shrink-0">
                  <img
                    src={previewState.image}
                    alt={previewState.name}
                    className="h-16 w-16 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/600x400?text=No+Image";
                    }}
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <h4 className="font-bold text-white">{previewState.name}</h4>

                  <p className="text-sm text-white">
                    {previewState.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-gray-50 bg-neutral-900 p-6">
              <h2 className="text-xl font-bold text-white">Register Project</h2>

              <div className="mt-4 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-4">
                  <form
                    className="flex flex-col gap-4"
                    onSubmit={handleRegister}
                  >
                    <>
                      <div className="relative rounded-md  border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                        <label
                          htmlFor="core"
                          className="block text-xs font-medium text-white"
                        >
                          Core ID
                        </label>
                        <input
                          type="text"
                          {...registerProjectForm.register("core", {
                            required: true,
                          })}
                          className="block w-full border-0 bg-transparent p-0 text-white focus:ring-transparent sm:text-sm"
                        />
                        {registerProjectForm.formState.errors.core ? (
                          <div className="text-red-400">
                            {registerProjectForm.formState.errors.core.message}
                          </div>
                        ) : null}
                      </div>

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
          </div>
        </Dialog.Panel>
      </>
    </Dialog>
  );
};

export default RegisterProject;
