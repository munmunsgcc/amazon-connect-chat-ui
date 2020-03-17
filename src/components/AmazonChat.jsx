/**
 * How to dev this whole chat UI.
 * 1. Get Amazon's Connect ChatJS here https://github.com/amazon-connect/amazon-connect-chatjs
 * 2. You will need to clone it and build it yourself.
 * 3. Get AWS.ConnectParticipant from https://sdk.amazonaws.com/builder/js/.
 * Build your own since aws-sdk npm lib doesn't have it.
 * 4. Refer to this script on how to peruse the connect.ChatSession methods, or
 * refer to this github https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/cloudformationTemplates/startChatContactAPI
 *
 * Make sure you have your Contact Flow, Security Profiles, Users, Queue, etc all setup and ready to
 * receive customer chats! I followed along this blog post to get the Contact Flow up and running.
 *
 * 1. Basic Contact Flow: https://blogs.perficient.com/2019/11/20/building-a-basic-inbound-chat-flow-in-amazon-connect/
 * 2. Disconnect Contact Flow: https://blogs.perficient.com/2019/11/20/ac-chat-disconnect-flow/
 */

import React from 'react';
import styled from 'styled-components';
import Mousetrap from 'mousetrap';

import '../js/amazon-connect-chat';
// imports in AWS.ConnectParticipants. Its so new, I had to use AWS Builder to custom build a lib.
// aws-sdk don't have this library!
import '../js/aws-sdk-2.639.0.min';

import ChatIcon from '../assets/chat.svg';
import CloseIcon from '../assets/close.svg';
import token from '../../token.json';

const ChatBox = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  z-index: 1;
  flex-direction: column;
  font-family: Lato;
  font-size: 17px;
  color: #114060;
`;

const ChatButton = styled.div`
  display: inline-block;
  align-self: flex-end;
  border-radius: 999px;
  background-color: #055399;
  box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.15);
  padding: 20px 25px;
  transition: all 0.3s ease;

  > svg {
    position: relative;
    transition: all 0.3s ease;
    top: 3px;
    width: 30px;
    height: 30px;
    fill: #ebfbff;
  }

  &:hover {
    background-color: #ebfbff;
    cursor: pointer;
    > svg {
      fill: #055399;
    }
  }
`;

const ChatContainer = styled.div`
  display: flex;
  opacity: ${({ show }) => (show === true ? 1 : 0)};
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.15);
  margin-bottom: 20px;
  transition: all 0.3s ease;
`;

const FormContainer = styled.div`
  text-align: center;
  padding: 15px;
  display: ${({ show }) => (show === true ? 'block' : 'none')};
`;

const DisplayName = styled.div`
  display: flex;
  flex-direction: column;
`;

const DisplayNameLabel = styled.div`
  padding: 8px;
`;

const DisplayNameInput = styled.input`
  border: none;
  outline: none;
  border-bottom: 1px solid #9e9e9e;
  margin-bottom: 30px;
`;

const StartChatButton = styled.button`
  border: none;
  border-radius: 10px;
  background-color: #2b8050;
  padding: 5px 10px;
  text-transform: uppercase;
  color: #fff;
`;

const ChatContentContainer = styled.div`
  display: ${({ show }) => (show === true ? 'block' : 'none')};
  width: 300px;
`;

const DisplayNameContainer = styled.div`
  padding: 10px;
  color: #1b75bc;
  font-size: 20px;
  border-bottom: 1px solid #c4c4c4;
  display: flex;
  flex-direction: row;
  align-self: center;
  justify-content: space-between;

  > svg {
    width: 30px;
    height: 30px;
    fill: red;
    &:hover {
      cursor: pointer;
    }
  }
`;

const ChatContent = styled.div`
  height: 300px;
  width: 100%;
  background-color: #fcfcfc;
  padding: 20px;
  display: flex;
  overflow: auto;
  flex-direction: column;

  > * {
    margin-bottom: 10px;
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const ChatInput = styled.input`
  border: none;
  border-top: 1px solid #c4c4c4;
  padding: 5px;
  line-height: 17px;
  background-color: #fff;
  font-size: 17px;
  width: 100%;
  outline: none;
`;

const Chat = styled.div`
  width: 80%;
  color: #055399;
  align-self: ${({ right }) => (right === true ? 'flex-end' : 'initial')};
  display: flex;
  flex-direction: column;

  > div {
    &:first-child {
      background-color: #efefef;
      padding: 10px;
      border-radius: 10px;
      margin-bottom: 4px;
      line-height: 1.2em;
      font-size: 16px;
    }
    &:last-child {
      font-size: 14px;
      align-self: ${({ right }) => (right === true ? 'flex-end' : 'initial')};
    }
  }
`;

let session;

const initChat = ({
  setMessage, setTypingStatus, name, setReadyState,
}) => {
  const logger = {
    debug: (data) => {
      console.debug(data);
    },
    info: (data) => {
      console.info(data);
    },
    warn: (data) => {
      console.warn(data);
    },
    error: (data) => {
      console.error(data);
    },
  };

  const globalConfig = {
    loggerConfig: {
      logger,
      // There are four levels available - DEBUG, INFO, WARN, ERROR. Default is INFO.
      level: window.connect.ChatSession.LogLevel.INFO,
    },
    region: token.region,
  };

  window.connect.ChatSession.setGlobalConfig(globalConfig);

  const initiateChatRequest = {
    ParticipantDetails: {
      DisplayName: name || 'Customer A',
    },
    ContactFlowId: token.ContentFlowId,
    InstanceId: token.InstanceId,
  };

  fetch(token.API, {
    method: 'post',
    body: JSON.stringify(initiateChatRequest),
  })
    .then((response) => response.json())
    .then((result) => {
      session = window.connect.ChatSession.create({
        chatDetails: result.data.startChatResult,
        type: 'CUSTOMER',
      });

      session.connect().then(
        (response) => response,
        (error) => Promise.reject(error),
      );

      session.onConnectionEstablished(() => {
        setReadyState(true);
      });

      session.onMessage((message) => {
        if (message.data.Content) {
          console.log(message);
          setMessage((prev) => {
            const newPrev = [...prev];
            const getTime = (str) => {
              const time = new Date(str);
              const timestamp = time.toLocaleTimeString('en-US');

              return timestamp;
            };

            newPrev.push({
              name: message.data.DisplayName,
              content: message.data.Content,
              timestamp: getTime(message.data.AbsoluteTime),
            });

            return newPrev;
          });
        }
      });

      session.onTyping((typingEvent) => {
        setTypingStatus(typingEvent.data.ParticipantRole === 'AGENT');
      });

      session.onConnectionBroken((data) => {
        // console.log('Connection broken', data);
      });
    })
    .catch((result) => {
      console.log('Error:', result);
    });
};

const AmazonChat = () => {
  const [show, setShow] = React.useState(false);
  const [start, setStart] = React.useState(false);
  const [name, setName] = React.useState('Customer');
  const [message, setMessage] = React.useState([]);
  const [readyState, setReadyState] = React.useState(false);
  const [typingStatus, setTypingStatus] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const mousetrap = new Mousetrap(inputRef.current);

    if (start === true) {
      mousetrap.bind('enter', () => {
        session.controller.sendMessage({
          message: inputRef.current.value,
          contentType: 'text/plain',
        });

        setTimeout(() => {
          inputRef.current.value = '';
        }, 100);
      });
    }

    return () => {
      mousetrap.unbind('enter');
    };
  }, [start]);

  return (
    <ChatBox>
      <ChatContainer show={show}>
        <FormContainer show={start === false}>
          <DisplayName>
            <DisplayNameLabel>What is your name?</DisplayNameLabel>
            <DisplayNameInput />
            <StartChatButton
              onClick={(e) => {
                const givenName = e.target.previousSibling.value;

                if (givenName !== '') {
                  setStart(true);
                  setName(givenName);
                  initChat({
                    setTypingStatus,
                    setMessage,
                    name: givenName,
                    setReadyState,
                  });
                }
              }}
            >
              Go
            </StartChatButton>
          </DisplayName>
        </FormContainer>
        <ChatContentContainer show={start === true}>
          <DisplayNameContainer>
            <span>{name}</span>
            <CloseIcon
              onClick={() => {
                setShow(false);
                setStart(false);
                setMessage([]);

                if (session && readyState === true) {
                  session.controller.disconnectParticipant();
                }
              }}
            />
          </DisplayNameContainer>
          <ChatContent>
            {message.map(({ name: displayName, content, timestamp }, index) => {
              if (displayName === name) {
                return (
                  <Chat right={false} key={`chat_${index}`}>
                    <div>{content}</div>
                    <div>{timestamp}</div>
                  </Chat>
                );
              }

              return (
                <Chat right key={`chat_${index}`}>
                  <div>{content}</div>
                  <div>{timestamp}</div>
                </Chat>
              );
            })}
            {typingStatus === true && (
              <Chat right>
                <div />
                <div>Agent is typing...</div>
              </Chat>
            )}
          </ChatContent>
          <ChatInput
            ref={inputRef}
            onChange={() => {
              if (session && readyState === true) {
                session.controller.sendEvent({
                  contentType: 'application/vnd.amazonaws.connect.event.typing',
                });
              }
            }}
          />
        </ChatContentContainer>
      </ChatContainer>
      <ChatButton
        title="Click to chat!"
        onClick={() => {
          setShow((prev) => !prev);
        }}
      >
        <ChatIcon />
      </ChatButton>
      {/* previous DOM structure copied and modified from https://github.com/amazon-connect/amazon-connect-chat-ui-examples/blob/master/cloudformationTemplates/startChatContactAPI/customBuildIndex.html */}
      {/* <div>
        <textarea type="text" ref={chatContentRef} />
      </div>
      <div>
        <button
          type="button"
          onClick={() => {
            const message = chatContentRef.current.value;

            session.controller.sendMessage({
              message,
              contentType: 'text/plain',
            });
          }}
        >
          Send
        </button>
      </div>
      <div style={{ display: 'inline-flex' }}>
        <div>
          <button
            type="button"
            id="getTranscript"
            onClick={() => {
              session
                .getTranscript({
                  scanDirection: 'BACKWARD',
                  sortOrder: 'ASCENDING',
                  maxResults: 15,
                })
                .then((response) => {
                  setChatTranscript(JSON.stringify(response.data.Transcript));
                });
            }}
          >
            Get transcript
          </button>
        </div>
        <div>
          <input
            type="button"
            id="sendTyping"
            onClick={() => {
              session.controller.sendEvent({
                contentType: 'application/vnd.amazonaws.connect.event.typing',
              });
            }}
            value="Send typing"
          />
        </div>
        <div>
          <input
            type="button"
            id="endChat"
            onClick={() => {
              session.controller.disconnectParticipant();
            }}
            value="End chat"
          />
        </div>
      </div>
      <div>
        <textarea readOnly id="chatTranscript" value={chatTranscript} />
      </div> */}
    </ChatBox>
  );
};

export default AmazonChat;
