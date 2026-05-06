import Logo from '../components/Logo';
import '../styles/global.css'
import { useNavigate } from 'react-router-dom';

const installations = [
    {
        id: '2',
        name: 'Breathing Pavilion',
        image: '/Breathing_Pavilion.jpeg',
    },
    {
        id: '1',
        name: 'Common Ground',
        image: '/Common_Ground.jpeg',
    },
];

export default function Installation() {
    const navigate = useNavigate();

    return (
         
        <>
        <Logo />
            <h2 className='installation-h2'>Which Installation Did You View?</h2>
            <div className="installation-container">
                {installations.map((installation, index) => (
                    <div key={installation.id} className={`installation-${index + 1}`}>
                        <img
                            src={installation.image}
                            alt={installation.name}
                            className='installation-img'
                        />
                        <p>{installation.name}</p>
                        <button
                            className='blue-button'
                            onClick={() => navigate('/survey', {
                                state: {
                                    installationId: installation.id,
                                    installationName: installation.name,
                                    installationImage: installation.image,
                                }
                            })}
                        >
                            Select
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}
