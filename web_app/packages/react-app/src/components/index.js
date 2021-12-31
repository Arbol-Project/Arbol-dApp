import styled from "styled-components";

export const Header = styled.header`
  background-color: white;
  min-height: 70px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  color: #3c3c3c;
`;

export const Body = styled.div`
  align-items: center;
  background-color: #3c3c3c;
  color: white;
  display: flex;
  flex-direction: row;
  font-size: calc(10px + 2vmin);
  justify-content: center;
  min-height: calc(100vh - 70px);
  font-family: Inter;
`;

export const Col = styled.div`
  align-items: center;
  background-color: #3c3c3c;
  color: white;
  display: flex;
  flex-direction: column;
  font-size: calc(10px + 2vmin);
  justify-content: center;
  min-height: calc(100vh - 70px);
  font-family: Inter;
`;

export const Image = styled.img`
  height: 30vmin;
  margin-top: 24px;
  margin-bottom: 8px;
  pointer-events: none;
`;

export const Text = styled.p`
  color: white;
  margin-top: 8px;
  margin-bottom: 8px;
  font-size: calc(24px + 2vmin);
  font-family: Inter;
`;

export const Link = styled.a.attrs({
  target: "_blank",
  rel: "noopener noreferrer",
})`
  color: #ea5f44;
  margin-top: 8px;
  margin-bottom: 8px;
  font-size: 10px;
  font-family: "Press Start 2P";
`;

export const Button = styled.button`
  background-color: #1DB16A;
  border: none;
  border-radius: 14px;
  color: #3c3c3c;
  cursor: pointer;
  font-size: 10px;
  text-align: center;
  text-decoration: none;
  margin: 0px 20px;
  padding: 12px 24px;
  margin-top: 8px;
  margin-bottom: 8px;
  font-family: "Press Start 2P";

  ${props => props.hidden && "hidden"} :focus {
    border: none;
    outline: none;
  }
`;
