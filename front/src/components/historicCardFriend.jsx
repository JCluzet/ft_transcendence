import React, { useEffect } from "react";
import "../styles/historic.css"
import "../styles/social.css"
import {useState} from 'react';
import Trophy from "../assets/images/trophy.png";
import Modal from "./HistoricModal";
import { accountService } from "../hooks/account_service";
import axios from "axios";

export default function HistoricFriend() {
    
    const [historic, setHistoric] = useState([]);

    useEffect(() => {
        var config = {
            method: "get",
            url: "/game-history/history/" + accountService.friendName(),
            headers: { Authorization: "Bearer " + accountService.userToken() },
          };
        axios(config).then((response) => setHistoric(response.data));
    }, [])

    const [isToggled, setIsToggled] = useState(false);

    const onToggle = () => setIsToggled(!isToggled);
    return (
        <div className="main">
            <h2>history</h2>       
            {historic.map((element) => {
                return (
                    <dir>
                        <div className="container-shiny" onClick={onToggle}>
                            <div className="row">
                                <div className="column-profile">
                                    <div>
                                        {/* <p>{element.winner}</p> */}
                                    </div>
                                {element.winner ?
                                        <div >
                                        <p>{element.winner}</p>
                                    <div className="winnerp1">
                                        <p>{element.winnerScore}</p>
                                        </div>
                                        <img src={Trophy} alt="pict" className="imagep1" />
                                        </div>
                                        :
                                        <div>
                                        <p>{element.winner}</p>
                                        <div className="loserp1">
                                        <p>{element.winnerScore}</p>
                                        </div> 
                                        </div> 
                                        }
                                    </div>
                                    <div className="column-profile">
                                    {element.winner ?
                                        <div>
                                            <p>{element.loser}</p>
                                        <div className="loserp2">
                                            <p>{element.loserScore}</p>
                                        </div>
                                        </div>
                                        :
                                        <div>
                                            <p>{element.loser}</p>
                                        <div className="winnerp2">
                                            <p>{element.loserScore}</p>
                                        </div>
                                        <img src={Trophy} alt="pict" className="imagep2" />
                                        </div>
                                    }
                                    </div>
                                </div>
                            <div className="date">
                                {Date}
                            </div>
                            <Modal show={isToggled} onClose={onToggle}>
                                
                                
                            </Modal>
                            </div>
                        </dir>
                    );
                })}
        </div>
    )
}