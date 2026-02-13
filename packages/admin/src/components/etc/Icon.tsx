import {Button as PrimeReactButton} from "primereact/button";
import {IconProps} from "@formmate/sdk";



export function Icon(
    {
        icon,
        onClick
    }: IconProps
) {
    return <PrimeReactButton rounded outlined className="mr-2" icon={icon} type={'button'} onClick={onClick}/>
}