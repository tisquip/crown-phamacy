export interface Branch {
  name: string;
  address: string;
  landline: string;
  cell: string;
  email: string;
  city?: string;
  comingSoon?: boolean;
}

export const branches: Branch[] = [
  {
    name: "Crown Pharmacy Fifth",
    address: "926-25 Fifth St Cnr Nelson Mandela",
    landline: "+263 242 708 625",
    cell: "+263 782 244 007",
    email: "fifth@diamondpharmacy.co.zw",
    city: "Harare",
  },
  {
    name: "Crown Pharmacy Kwame",
    address: "Robinson House, 51 Kwame Nkrumah Ave Cnr Angwa",
    landline: "+263 242 752 400",
    cell: "+263 783 600 608",
    email: "kwame@diamondpharmacy.co.zw",
    city: "Harare",
  },
  {
    name: "Crown Pharmacy Mutare",
    address: "67 H. Chitepo, Stanbic Building",
    landline: "+263 202 021 850",
    cell: "+263 782 600 615",
    email: "mutare@diamondpharmacy.co.zw",
    city: "Mutare",
  },
  {
    name: "Crown Pharmacy Chinhoyi",
    address: "148 Commercial St, JMX Mall Close to OK",
    landline: "+263 868 800 8635",
    cell: "+263 782 002 546",
    email: "chinhoyi@crownpharmacy.co.zw",
    city: "Chinhoyi",
  },
  {
    name: "Crown Pharmacy Borrowdale",
    address: "",
    landline: "",
    cell: "",
    email: "",
    city: "Harare",
    comingSoon: true,
  },
];
