package com.house.service.dto;

import com.house.service.MlClientService;
import lombok.Data;

import java.util.List;

@Data
public class BatchResponseDTO {

    private List<BatchResultDTO> results;

}
