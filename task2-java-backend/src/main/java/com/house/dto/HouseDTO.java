package com.house.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class HouseDTO {
    private Double squareFootage;

    private Integer bedrooms;

    private Double bathrooms;

    private Integer yearBuilt;

    private Double lotSize;

    private Double distanceToCityCenter;

    private Double schoolRating;


    private Double price;

}