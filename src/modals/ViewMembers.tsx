import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal, { Metadata, ModalState, modalName } from "../stores/modals";
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { AnyJson } from "@polkadot/types/types";
import Button from "../components/Button";
import { BG_GRADIENT } from "../utils/consts";
import useApi from "../hooks/useApi";
import toast from "react-hot-toast";
import SocialXIcon from "../assets/social-x-icon.svg";
import SocialDiscordIcon from "../assets/social-discord-icon.svg";
import CheckIcon from "../assets/check-icon.svg";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";

interface IdentityProps { Raw?: string; None?: null; raw?: string; none?: string; }

interface PalletIdentityRegistrationProps {
  [account: string]: IdentityRegistrationProps;
}

interface IdentityRegistrationProps {
  display?: IdentityProps;
  image?: IdentityProps;
  twitter?: IdentityProps;
  judgements?: JudgementProps;
  [key: string]: IdentityProps | IdentityProps[][] | string | [string, string][] | undefined;
}

interface JudgementProps { [key: number]: string | undefined; }

interface ViewMembersProps { isOpen: boolean; }

interface ViewMembersMetadata extends Metadata {
  name: string;
  image: string;
  members: AnyJson[];
}

const ViewMembers = (props: ViewMembersProps) => {
  const { isOpen } = props;
  const api = useApi();
  const { closeCurrentModal, openModals } = useModal<ModalState>(
    (state) => state,
    shallow
  );
  const [loading, setLoading] = useState(true);
  const [membersIdentity, setMembersIdentity] = useState<PalletIdentityRegistrationProps>({});
  const [localMetadata, setLocalMetadata] = useState<ViewMembersMetadata | null>(null);
  const targetModal = openModals.find(modal => modal.name === modalName.MEMBERS);
  const metadata = targetModal ? targetModal.metadata : undefined;

  const closeModal = () => {
    closeCurrentModal();
  };

  const handleCopy = (value: string | undefined) => {
    if (!value) return;

    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard');
  };

  useEffect(() => {
    if (localMetadata && localMetadata.members) {
      const fetchIdentities = async () => {
        setLoading(true);
        try {
          const memberPromises = localMetadata.members.map(async (member) => {
            const identity = await api.query.identity.identityOf(member);
            if (identity) {
              const identityHuman = identity.toHuman();
              if (typeof identityHuman === 'object' && identityHuman !== null && 'info' in identityHuman) {
                const info = identityHuman.info as IdentityRegistrationProps;
                const judgements = identityHuman.judgements as JudgementProps;
                const allowedKeys = ['display', 'image', 'twitter', 'additional'];
                const unwrappedInfo: IdentityRegistrationProps = {};

                if (judgements) {
                  const verdict = Object.entries(judgements).map(([, value]) => value)[0];
                  if (Array.isArray(verdict) && verdict.length > 1 && typeof verdict[1] === 'string') {
                    unwrappedInfo['judgements'] = verdict[1];
                  }
                }

                Object.entries(info).forEach(([key, value]) => {
                  if (allowedKeys.includes(key)) {
                    if (key === 'additional' && Array.isArray(value)) {
                      value.forEach(([first, second]) => {
                        if (typeof first === 'object' && first !== null && 'Raw' in first &&
                          typeof second === 'object' && second !== null && 'Raw' in second && first.Raw && second.Raw) {
                          unwrappedInfo[first.Raw.toLowerCase()] = second.Raw;
                        }
                      });
                    } else if (typeof value === 'object' && value !== null && 'Raw' in value) {
                      unwrappedInfo[key] = value.Raw;
                    }
                  }
                });

                return member ? { [member.toString()]: unwrappedInfo } : null;
              }
            }
            return null;
          });

          const membersIdentities = await Promise.all(memberPromises);
          const newMembersIdentity = Object.assign({}, ...membersIdentities.filter(Boolean));
          setMembersIdentity(newMembersIdentity);
        } catch (error) {
          console.error(error);
        }
        setLoading(false);
      };

      fetchIdentities();
    }
  }, [localMetadata, localMetadata?.members, api]);

  useEffect(() => {
    if (metadata) {
      setLocalMetadata(metadata as ViewMembersMetadata);
    }

    return () => {
      setLocalMetadata(null);
    };
  }, [metadata]);

  if (!localMetadata) return null;

  const { name, members, image } = localMetadata;

  if (!name || !members || !image) return null;

  return isOpen ? (
    <Dialog open={true} onClose={closeModal}>
      <Dialog.Title className="sr-only">View Members</Dialog.Title>
      <div className="fixed inset-0 z-[49] h-screen w-full bg-black/10 backdrop-blur-md" />
      <button className="pointer fixed top-0 right-0 z-[50] flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">Close</span>
      </button>
      <Dialog.Panel>
        <>
          <div className={`fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] sm:w-auto h-[472px] rounded-xl space-y-4 p-8 border border-[2px] border-neutral-700 ${ BG_GRADIENT }`}>
            <div className="flex items-center space-x-4">
              <Avatar src={image} alt="Project Image" />
              <div className="flex flex-col items-start gap-1 justify-start">
                <div className="font-bold text-white text-[18px] text-center tracking-[0] leading-none">
                  {name}
                </div>
                <span className="text-xs text-tinkerTextGrey">Members: {members ? members.length : 0}</span>
              </div>
            </div>
            <div className="overflow-y-auto h-3/5 tinker-scrollbar scrollbar scrollbar-thin scrollbar-thumb-amber-300 pr-5">
              <div className="text-white text-[14px] tracking-[0] leading-[18px] flex flex-col gap-2">
                {!loading ? members.map((member) => {
                  const rawMemberIdentity = member ? membersIdentity[member.toString()] : null;
                  const memberIdentity = rawMemberIdentity ? Object.fromEntries(
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    Object.entries(rawMemberIdentity).filter(([_, value]) => typeof value !== 'object')
                  ) : null;
                  return (
                    <div className="rounded-lg bg-tinkerGrey hover:bg-tinkerLightGrey transition-colors hover:text-tinkerYellow px-4 py-3" key={member?.toString()}>
                      <div className="flex flex-row gap-2 items-center">
                        <Avatar src={memberIdentity && typeof memberIdentity.image === 'string' ? memberIdentity.image : undefined} alt="Member Image" mini />

                        <div className="truncate">
                          {memberIdentity && (
                            <div className="flex flex-row justify-between mb-[2px]">
                              <div className="flex flex-row items-center">
                                {typeof memberIdentity.judgements === 'string' && memberIdentity.judgements === 'KnownGood' ? <img src={CheckIcon} alt="KnownGood" className="h-3 w-3 bg-red mr-1" /> : null}
                                <div className="font-bold text-md">{typeof memberIdentity.display === 'string' ? memberIdentity.display : null}</div>
                              </div>
                              <div className="flex flex-row gap-2 items-center">
                                {typeof memberIdentity.twitter === 'string' && (
                                  <Link to={`https://x.com/${ memberIdentity.twitter }`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100">
                                    <img src={SocialXIcon} alt="Social X" className="h-3 w-3" />
                                  </Link>
                                )}

                                {typeof memberIdentity.discord === 'string' && (
                                  <Link to={`https://discord.com/users/${ memberIdentity.discord }`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100">
                                    <img src={SocialDiscordIcon} alt="Social Discord" className="h-4 w-4" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          )}

                          <div onClick={() => handleCopy(member?.toString())} className="text-xs hover:cursor-copy truncate text-tinkerTextGrey hover:underline underline-offset-2">
                            {member?.toString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : <LoadingSpinner />}
              </div>
            </div>
            <div>
              <Button variant="secondary" mini onClick={closeModal}>Close</Button>
            </div>
          </div>
        </>
      </Dialog.Panel>
    </Dialog>
  ) : null;
};

export default ViewMembers;
